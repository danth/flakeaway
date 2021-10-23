const fs = require('fs')
const util = require('util')
const _ = require('lodash')
const Queue = require('bull')
const { v4: uuidv4 } = require('uuid')
const { Octokit } = require("@octokit/rest")
const { App, createNodeMiddleware } = require('@octokit/app')
const { readFlake, getBuildableFragments } = require('./flake.js')
const { runNix } = require('./nix.js')

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

const queue = new Queue(
  'jobs',
  { redis: { port: 6379, host: '127.0.0.1' } }
)

async function getSuppportedSystems() {
  const { stdout } = await runNix(['show-config', '--json'])
  const config = JSON.parse(stdout)

  const { stdout: currentSystem } = await runNix(
    ['eval', '--expr', 'builtins.currentSystem', '--raw', '--impure']
  )

  return [currentSystem, ...config["extra-platforms"].value]
}

async function createEvaluation({ octokit, payload }) {
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const head_sha = payload.check_suite
                 ? payload.check_suite.head_sha
                 : payload.check_run.check_suite.head_sha
  const head_branch = payload.check_suite
                    ? payload.check_suite.head_branch
                    : payload.check_run.check_suite.head_branch

  const id = uuidv4()

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: 'Evaluate',
    status: 'queued',
  })

  queue.add('evaluation', {
    installation_id: payload.installation.id,
    check_run_id: check_run.data.id,
    repository: payload.repository,
    head: {
      commit: head_sha,
      branch: head_branch,
    },
  }, {
    jobId: id,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created evaluation ${id} for ${owner}/${repo}`)
}

async function createBuild({ octokit, installation_id, repository, head, fragment }) {
  const id = uuidv4()

  const check_run = await octokit.rest.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    head_sha: head.commit,
    external_id: id,
    name: `Build ${fragment}`,
    status: 'queued',
  })

  queue.add('build', {
    check_run_id: check_run.data.id,
    installation_id,
    repository,
    head,
    fragment,
  }, {
    jobId: id,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created build ${id}`)
}

async function flakeUrl(octokit, repository, { branch, commit }) {
  const { token } = await octokit.auth({
    type: 'installation',
    repositoryIds: [repository.id],
    permissions: { contents: 'read' },
  })
  const owner = repository.owner.login
  const repo = repository.name

	return `git+https://oauth2:${token}@github.com/${owner}/${repo}.git?ref=${branch}&rev=${commit}`
}

async function readFlakeGithub(octokit, repository, head) {
  const url = await flakeUrl(octokit, repository, head)
  return await readFlake(url)
}

async function runEvaluation(job) {
  const { check_run_id, installation_id, repository, head } = job.data
  console.log(`Running evaluation ${job.id}`)

  const octokit = await app.getInstallationOctokit(installation_id)

  const owner = repository.owner.login
  const repo = repository.name

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const flake = await readFlakeGithub(octokit, repository, head)
  if (!flake) {
    console.warn(`Failed to evaluate ${job.id}`)
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'Evaluation failed',
        summary: 'There was an error during evaluation of `flake.nix`.'
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
    fragment => createBuild({ octokit, installation_id, repository, head, fragment })
  ))

  console.log(`Finished evaluation ${job.id}`)
}

queue.process('evaluation', runEvaluation)

function formatLog(stdout) {
  const truncatedMessage = 'Earlier lines of this build log were truncated.\n'
  const limit = 65535 - 8 - truncatedMessage.length

  // Remove ANSI escape sequences
  const log = stdout.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')

  const logLines = log.split('\n')

  var totalLength = 0
  const truncatedLines = _.takeRightWhile(
    logLines,
    line => {
      totalLength += line.length + 1
      return totalLength <= limit
    }
  )

  const truncatedLog = truncatedLines.join('\n')

  const prefix = truncatedLines.length < logLines.length ? truncatedMessage : ''

  return prefix + '```\n' + truncatedLog + '\n```'
}

async function buildFragment(url, fragment, outLink) {
  function addLog(obj, log) {
    if (log) return { log: formatLog(log), ...obj }
    return obj
  }

  const evaluation = await runNix([
    "eval",
    `${url}#${fragment}`,
    "--apply",
    "output: { inherit (output) system drvPath; }",
    "--json"
  ])
  if (evaluation.exitCode > 0) {
    return addLog({ success: false, skipped: false })
  }
  const { system, drvPath } = JSON.parse(evaluation.stdout)

  // TODO: Don't reload supported systems for each build
  const supportedSystems = await getSuppportedSystems()
  if (!supportedSystems.includes(system)) {
    return { success: false, skipped: true }
  }

  const build = await runNix(["build", drvPath, "--out-link", outLink])
  const success = build.exitCode == 0

  const log = await runNix(["log", drvPath])
  if (log.exitCode == 0) {
    return addLog({ success, skipped: false }, log.stdout)
  } else {
    return { success, skipped: false }
  }
}

async function runBuild(job) {
  const { check_run_id, installation_id, repository, head, fragment } = job.data
  console.log(`Running build ${job.id}`)

  const octokit = await app.getInstallationOctokit(installation_id)

  const owner = repository.owner.login
  const repo = repository.name

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const url = await flakeUrl(octokit, repository, head)
  const outLink = `/var/lib/flakeaway/gc-roots/${owner}/${repo}/${head.branch}/${head.commit}/${fragment}`
  const { success, skipped, log } = await buildFragment(url, fragment, outLink)

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
    console.log(`Finished build ${job.id}`)
  } else if (skipped) {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'skipped',
      output: {
        title: 'Build unavailable',
        summary: 'This fragment cannot be built as it requires a platform which is not supported.',
        text: log
      }
    })
    console.log(`Skipped build ${job.id}`)
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
    console.log(`Failed to build ${job.id}`)
  }
}

queue.process('build', runBuild)

app.webhooks.on('check_suite.requested', createEvaluation)
app.webhooks.on('check_suite.rerequested', createEvaluation)
app.webhooks.on('check_run.rerequested', async ({ octokit, payload }) => {
  if (payload.check_run.app.id != process.env.APP_ID) return

  // TODO: Recreate individual builds
  await createCheck({ octokit, payload })
})

process.on('SIGTERM', async () => {
  console.info('Waiting for current jobs to finish')
  await queue.pause(true) // Local pause
  await queue.close()
  process.exit(0)
})

require('http').createServer(createNodeMiddleware(app)).listen(15345)
