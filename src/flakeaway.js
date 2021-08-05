const fs = require('fs')
const { Octokit } = require("@octokit/rest")
const { App, createNodeMiddleware } = require('@octokit/app')
const { readFlakeGithub, getBuildableFragments } = require('./flake.js')

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

async function createCheck({ octokit, payload }) {
  const owner = payload.repository.owner.login
  const repo = payload.repository.name

  console.log(`Creating check for ${owner}/${repo}`)
  await octokit.rest.checks.create({
    owner,
    repo,
    head_sha: payload.check_suite
      ? payload.check_suite.head_sha
      : payload.check_run.sha,
    name: 'Evaluate Flake',
    status: 'in_progress',
  })
  console.log(`Created check for ${owner}/${repo}`)
}

async function updateCheck({ octokit, payload }) {
  const owner = payload.repository.owner.login
  const repo = payload.repository.name

  console.log(`Retrieving token for ${owner}/${repo}`)
  const { token } = await octokit.auth({
    type: 'installation',
    repositoryIds: [payload.repository.id],
    permissions: { contents: 'read' },
  })

  console.log(`Evaluating ${owner}/${repo}`)
  try {
    const flake = await readFlakeGithub(owner, repo, token, payload.check_run.head_sha)
  } catch (error) {
    console.warn(`Failed to evaluate ${owner}/${repo}`)
    console.warn(error)
    await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: payload.check_run.id,
      status: 'completed',
      conclusion: 'failure',
    })
    console.log(`Marked ${owner}/${repo} as failure`)
    return
  }

  console.log(`Getting fragments for ${owner}/${repo}`)
  const fragments = getBuildableFragments(flake)

  console.log(`Finished evaluating ${owner}/${repo}`)
  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: payload.check_run.id,
    status: 'completed',
    conclusion: 'success',
  })
  console.log(`Marked ${owner}/${repo} as success`)
}

app.webhooks.on('check_suite.requested', createCheck)
app.webhooks.on('check_suite.rerequested', createCheck)

app.webhooks.on('check_run.created', async ({ octokit, payload }) => {
  if (payload.check_run.app.id != process.env.APP_ID) return
  await updateCheck({ octokit, payload })
})
app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.app.id != process.env.APP_ID) return
  await createCheck({ octokit, payload })
})

require('http').createServer(createNodeMiddleware(app)).listen(15345)
