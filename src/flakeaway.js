const fs = require('fs')
const async = require('async')
const { v4: uuidv4 } = require('uuid')
const { Octokit } = require("@octokit/rest")
const { App, createNodeMiddleware } = require('@octokit/app')
const { readFlake, getBuildableFragments } = require('./flake.js')

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

const queue = async.queue(
  (task, completed) => completed(runEvaluation(task)),
  1
)

async function createCheck({ octokit, payload }) {
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const head_sha = payload.check_suite
                 ? payload.check_suite.head_sha
                 : payload.check_run.head_sha

  const id = uuidv4()

  const check_run = await octokit.rest.checks.create({
    owner,
    repo,
    head_sha,
    external_id: id,
    name: 'Evaluate Flake',
    status: 'queued',
  })

  queue.push({
    type: 'evaulation',
    id,
    check_run_id: check_run.data.id,
    repository: payload.repository,
    head_sha,
    octokit,
  })

  console.log(`Created evaluation ${id} for ${owner}/${repo}`)
}

async function readFlakeGithub(octokit, repository, revision) {
  const { token } = await octokit.auth({
    type: 'installation',
    repositoryIds: [repository.id],
    permissions: { contents: 'read' },
  })
  const owner = repository.owner.login
  const repo = repository.name

	const url = `git+https://oauth2:${token}@github.com/${owner}/${repo}.git?rev=${revision}`
  return await readFlake(url)
}

async function runEvaluation({ id, check_run_id, repository, head_sha, octokit }) {
  console.log(`Running evaluation ${id}`)

  const owner = repository.owner.login
  const repo = repository.name

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  let flake
  try {
    flake = await readFlakeGithub(octokit, repository, head_sha)
  } catch (error) {
    console.warn(error)
    console.warn(`Failed to evaluate ${id}`)
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'failure',
    })
    return
  }

  const fragments = getBuildableFragments(flake)

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'completed',
    conclusion: 'success',
  })

  console.log(`Finished evaluation ${id}`)
}

app.webhooks.on('check_suite.requested', createCheck)
app.webhooks.on('check_suite.rerequested', createCheck)
app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.app.id != process.env.APP_ID) return
  await createCheck({ octokit, payload })
})

require('http').createServer(createNodeMiddleware(app)).listen(15345)
