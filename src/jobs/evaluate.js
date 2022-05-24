import { v4 as uuidv4 } from 'uuid'
import { createBuild } from './build.js'
import { evaluateJobs } from '../nix/evaluate.js'
import { githubFlakeUrl, reducePayload } from '../github.js'
import { formatLog, isSystemError } from '../log.js'

export async function createEvaluation({ octokit, payload, queue }) {
  const id = uuidv4()
  const target = reducePayload(payload)
  const { owner, repo, head_sha } = target

  // Don't process repositories which aren't allowed to use this instance
  if (process.env.ALLOWED_USERS) {
    const allowedUsers = process.env.ALLOWED_USERS.split(',')
    if (!allowedUsers.includes(owner)) {
      console.warn(
        `Blocked evaluation of ${owner}/${repo} because ` +
        `${owner} is not authorised to use this instance`
      )
      return
    }
  }

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: 'Evaluate',
    status: 'queued',
  })

  await queue.add({
    target,
    check_run_id: check_run.data.id,
  }, {
    jobId: id,
    priority: 1,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created evaluation ${id} for ${owner}/${repo}`)
}

export let rerequestEvaluation = createEvaluation

function statusFailed(status, job) {
  if (isSystemError(job.error)) {
    status.numberSkipped += 1
  } else {
    status.conclusion = 'failure'
    status.failedSummary += `- ${job.attr}\n`
    status.failedSummary += '  ```\n  '
    status.failedSummary += job.error.replace('\n', '\n  ')
    status.failedSummary += '\n  ```\n'
  }
}

function statusSucceeded(status, job) {
  status.succeededSummary += `- ${job.attr}\n`
}

async function publishError({ octokit, owner, repo, check_run_id }) {
  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'completed',
    conclusion: 'failure',
    output: {
      title: 'Evaluation failed',
      summary: 'There was an error when trying to evaluate the outputs of the flake.'
    }
  })
}

async function publishStatus({ octokit, owner, repo, check_run_id, status }) {
  let summary = ''
  if (status.failedSummary) {
    summary += '### Failed to evaluate:\n'
    summary += status.failedSummary
  }
  if (status.numberSkipped) {
    summary += '### Evaluation unavailable:\n'
    summary += `${status.numberSkipped} jobs could not be evaluated because `
    summary += 'their evaluation requires a platform which is not supported.\n'
  }
  if (status.succeededSummary) {
    summary += '### Evaluated successfully:\n'
    summary += status.succeededSummary
  }
  if (!status.failedSummary && !status.succeededSummary) {
    status.conclusion = 'neutral'
    summary += 'This flake does not contain any buildable outputs.'
  }

  const title =
    status.conclusion == 'failure'
    ? 'Evaluation partially failed'
    : 'Evaluation finished'

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'completed',
    conclusion: status.conclusion,
    output: { title, summary }
  })
}

export async function runEvaluation({ app, buildQueue, job }) {
  console.log(`Running evaluation ${job.id}`)

  const { target, check_run_id } = job.data
  const { owner, repo, installation_id } = target

  const octokit = await app.getInstallationOctokit(installation_id)

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const status = {
    conclusion: 'success',
    succeededSummary: '',
    failedSummary: '',
    numberSkipped: 0
  }

  const exitCode = await evaluateJobs(
    await githubFlakeUrl({ octokit, target }),
    async evaluatedJob => {
      if (evaluatedJob.error) {
        statusFailed(status, evaluatedJob)
      } else {
        statusSucceeded(status, evaluatedJob)
        await createBuild({
          octokit,
          queue: buildQueue,
          target,
          fragment: evaluatedJob.attr,
          drvPath: evaluatedJob.drvPath
        })
      }
    }
  )

  if (exitCode > 0) {
    await publishError({ octokit, owner, repo, check_run_id })
  } else {
    await publishStatus({ octokit, owner, repo, check_run_id, status })
  }

  console.log(`Finished evaluation ${job.id}`)
}
