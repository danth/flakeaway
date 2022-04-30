import fs from 'fs'
import Queue from 'bull'
import { Octokit } from '@octokit/rest'
import { App, createNodeMiddleware } from '@octokit/app'
import { createServer } from 'http'
import { createEvaluation, rerequestEvaluation, runEvaluation } from './jobs/evaluate.js'
import { rerequestBuild, runBuild } from './jobs/build.js'

const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE)
const app = new App({
  appId: process.env.APP_ID,
  privateKey,
  oauth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  webhooks: {
    secret: process.env.WEBHOOK_SECRET,
  },
  Octokit
})

app.octokit.request('/app')
  .then(({ data }) => console.log('authenticated as %s', data.name))

const queue = new Queue('jobs', { redis: { path: process.env.REDIS } })
queue.process('evaluation', 1, job => runEvaluation({ app, job }))
// Concurrency stacks. Since the evaluation processor already has a concurrency
// of 1, we don't want to add any more.
queue.process('build', 0, job => runBuild({ app, job }))

app.webhooks.on('check_suite.requested', async ({ octokit, payload }) => {
  await createEvaluation({ octokit, payload, queue })
})

app.webhooks.on('check_suite.rerequested', async ({ octokit, payload }) => {
  await rerequestEvaluation({ octokit, payload, queue })
})

app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.name.startsWith("Build")) {
    await rerequestBuild({ octokit, payload, queue })
  } else {
    await rerequestEvaluation({ octokit, payload, queue })
  }
})

process.on('SIGTERM', async () => {
  console.info('Waiting for current jobs to finish')
  await queue.pause(true) // Local pause
  await queue.close()
  process.exit(0)
})

createServer(createNodeMiddleware(app)).listen(15345)
