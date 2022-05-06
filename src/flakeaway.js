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

function logJobError(job, error) {
  console.error(`${job.id} encountered an error:`)
  console.error(error)
}

const BUILD_CONCURRENCY = parseInt(process.env.BUILD_CONCURRENCY)
const EVALUATION_CONCURRENCY = parseInt(process.env.EVALUATION_CONCURRENCY)

const buildQueue = new Queue('builds', { redis: { path: process.env.REDIS } })
buildQueue.on('failed', logJobError)
buildQueue.process(BUILD_CONCURRENCY, job => runBuild({ app, job }))

const evaluationQueue = new Queue('evaluations', { redis: { path: process.env.REDIS } })
evaluationQueue.on('failed', logJobError)
evaluationQueue.process(EVALUATION_CONCURRENCY, job => runEvaluation({ app, job, buildQueue }))

app.webhooks.on('check_suite.requested', async ({ octokit, payload }) => {
  await createEvaluation({ octokit, payload, queue: evaluationQueue })
})
app.webhooks.on('check_suite.rerequested', async ({ octokit, payload }) => {
  await rerequestEvaluation({ octokit, payload, queue: evaluationQueue })
})
app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.name.startsWith("Build")) {
    await rerequestBuild({ octokit, payload, queue: buildQueue })
  } else {
    await rerequestEvaluation({ octokit, payload, queue: evaluationQueue })
  }
})

process.on('SIGTERM', async () => {
  console.info('Waiting for current jobs to finish')

  await Promise.all([
    buildQueue.pause(true),
    evaluationQueue.pause(true)
  ])

  await Promise.all([
    buildQueue.close(),
    evaluationQueue.close()
  ])

  process.exit(0)
})

createServer(createNodeMiddleware(app)).listen(15345)
