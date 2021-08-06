const fs = require('fs')
const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
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

const queues = require('queuey')('/var/lib/flakeaway/queue.json')

app.octokit.request('/app')
  .then(({ data }) => console.log('authenticated as %s', data.name))

const queue = queues.queue({
  name: 'jobs',
  worker: task => {
    if (task.type == 'evaluation') {
      return runEvaluation(task)
    } else {
      return runBuild(task)
    }
  }
})

async function createEvaluation({ octokit, payload }) {
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const head_sha = payload.check_suite
                 ? payload.check_suite.head_sha
                 : payload.check_run.head_sha

  const id = uuidv4()

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: 'Evaluate',
    status: 'queued',
  })

  queue.enqueue({
    type: 'evaluation',
    id,
    installation_id: payload.installation.id,
    check_run_id: check_run.data.id,
    repository: payload.repository,
    head_sha,
  })

  console.log(`Created evaluation ${id} for ${owner}/${repo}`)
}

async function createBuild({ octokit, installation_id, repository, head_sha, fragment }) {
  const id = uuidv4()

  const check_run = await octokit.rest.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    head_sha,
    external_id: id,
    name: `Build ${fragment}`,
    status: 'queued',
  })

  queue.enqueue({
    type: 'build',
    id,
    check_run_id: check_run.data.id,
    installation_id,
    repository,
    head_sha,
    fragment,
  })

  console.log(`Created build ${id}`)
}

async function flakeUrl(octokit, repository, revision) {
  const { token } = await octokit.auth({
    type: 'installation',
    repositoryIds: [repository.id],
    permissions: { contents: 'read' },
  })
  const owner = repository.owner.login
  const repo = repository.name

	return `git+https://oauth2:${token}@github.com/${owner}/${repo}.git?rev=${revision}`
}

async function readFlakeGithub(octokit, repository, revision) {
  const url = await flakeUrl(octokit, repository, revision)
  return await readFlake(url)
}

async function runEvaluation({ id, check_run_id, installation_id, repository, head_sha }) {
  console.log(`Running evaluation ${id}`)

  const octokit = await app.getInstallationOctokit(installation_id)

  const owner = repository.owner.login
  const repo = repository.name

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  try {
    var flake = await readFlakeGithub(octokit, repository, head_sha)
  } catch (error) {
    console.warn(error)
    console.warn(`Failed to evaluate ${id}`)
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'Evaluation failed',
        summary: 'There was an error during evaluation of `flake.nix`.',
        text: '```\n' + error.stderr + '\n```'
      }
    })
    return
  }

  const fragments = getBuildableFragments(flake)

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'completed',
    conclusion: 'success',
    output: {
      title: 'Evaluation succeeded',
      summary: (
        `These ${fragments.length} fragments will be built:\n` +
        fragments.map(fragment => `- ${fragment}`).join('\n')
      )
    }
  })

  await Promise.all(fragments.map(
    fragment => createBuild({ octokit, installation_id, repository, head_sha, fragment })
  ))

  console.log(`Finished evaluation ${id}`)
}

async function buildFragment(url, fragment) {
  const { stdout: drvPath } = await execFile(
    "nix", ["eval", "--raw", `${url}#${fragment}`, "--apply", "output: output.drvPath"]
  )

  var success = true
  try {
    await execFile("nix", ["build", drvPath, "--no-link"])
  } catch (error) {
    success = false
  }

  try {
    var { stdout } = await execFile("nix", ["log", drvPath])
  } catch (error) {
    return { success }
  }

  if (stdout.length) {
    const log = '```\n' + stdout + '\n```'
    return { success, log }
  }

  return { success }
}

async function runBuild({ id, check_run_id, installation_id, repository, head_sha, fragment }) {
  console.log(`Running build ${id}`)

  const octokit = await app.getInstallationOctokit(installation_id)

  const owner = repository.owner.login
  const repo = repository.name

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const url = await flakeUrl(octokit, repository, head_sha)
  const { success, log } = await buildFragment(url, fragment)

  if (success) {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'success',
      output: {
        title: 'Build succeeded',
        summary: 'This fragment was built or substituted successfully.',
        text: log
      }
    })
    console.log(`Finished build ${id}`)
  } else {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'Build failed',
        summary: 'There was an error during the build or substitution of this fragment.',
        text: log
      }
    })
    console.log(`Failed to build ${id}`)
  }
}

app.webhooks.on('check_suite.requested', createEvaluation)
app.webhooks.on('check_suite.rerequested', createEvaluation)
app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.app.id != process.env.APP_ID) return

  // TODO: Recreate individual builds
  await createCheck({ octokit, payload })
})

require('http').createServer(createNodeMiddleware(app)).listen(15345)
