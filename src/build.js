const _ = require('lodash')
const { v4: uuidv4 } = require('uuid')
const { githubFlakeUrl, reducePayload } = require('./github.js')
const { runNix } = require('./nix.js')

function removeANSI(text) {
  return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}

const systemError = /^error: a '\S+' with features {.*} is required to build '\S+'/m
function isSystemError(stderr) {
  return systemError.test(removeANSI(stderr))
}

function formatLog(stdout) {
  if (!stdout) return undefined

  const truncatedMessage = 'Earlier lines of this build log were truncated.\n'
  const limit = 65535 - 8 - truncatedMessage.length

  const logLines = removeANSI(stdout).split('\n')

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
  const evaluation = await runNix([
    "eval",
    `${url}#${fragment}`,
    "--apply",
    "output: output.drvPath",
    "--raw"
  ])
  const drvPath = evaluation.stdout

  if (evaluation.exitCode > 0) {
    return {
      success: false,
      skipped: isSystemError(evaluation.stderr),
      log: formatLog(evaluation.stderr),
    }
  }

  const build = await runNix(["build", drvPath, "--out-link", outLink])

  return {
    success: build.exitCode == 0,
    skipped: isSystemError(build.stderr),
    log: formatLog(evaluation.stderr + "\n" + build.stderr),
  }
}

async function createBuild({ octokit, queue, target, fragment }) {
  const id = uuidv4()
  const { owner, repo, head_sha } = target

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: `Build ${fragment}`,
    status: 'queued',
  })

  await queue.add('build', {
    target, fragment,
    check_run_id: check_run.data.id,
  }, {
    jobId: id,
    priority: 2,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created build ${id}`)
}

async function rerequestBuild({ octokit, payload, queue }) {
  await createBuild({
    octokit, queue,
    target: reducePayload(payload),
    /* .slice(6) removes 'Build ' from the start of the name,
     * leaving the fragment to be rebuilt.
     * TODO: Determine the rerequested fragment more reliably.
     */
    fragment: payload.check_run.name.slice(6),
  })
}

async function runBuild({ app, job }) {
  console.log(`Running build ${job.id}`)

  const { target, fragment, check_run_id } = job.data
  const { owner, repo, head_branch, head_sha, installation_id } = target

  const octokit = await app.getInstallationOctokit(installation_id)

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const url = await githubFlakeUrl({ octokit, target })
  const outLink = `/var/lib/flakeaway/gc-roots/${owner}/${repo}/${head_branch}/${head_sha}/${fragment}`
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

module.exports = { createBuild, rerequestBuild, runBuild }
