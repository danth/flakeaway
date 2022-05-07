import { v4 as uuidv4 } from 'uuid'
import { createBuild } from './build.js'
import { evaluateJobs } from '../nix/evaluate.js'
import { githubFlakeUrl, reducePayload } from '../github.js'
import { formatLog } from '../log.js'

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

async function publishStatus({ octokit, owner, repo, check_run_id, jobs }) {
  let conclusion = 'success'
  let succeededSummary = ''
  let failedSummary = ''

  for (const job of jobs) {
    if (job.error) {
      conclusion = 'failure'
      failedSummary += `- ${job.attr}\n`
      failedSummary += '  ```\n  '
      failedSummary += job.error.replace('\n', '\n  ')
      failedSummary += '\n  ```\n'
    } else {
      succeededSummary += `- ${job.attr}\n`
    }
  }

  const title = conclusion == 'failure'
    ? 'Evaluation partially failed'
    : 'Evaluation finished'

  let summary = ''
  if (failedSummary) {
    summary += '### Failed to evaluate:\n'
    summary += failedSummary
  }
  if (succeededSummary) {
    summary += '### Evaluated successfully:\n'
    summary += succeededSummary
  }
  if (!failedSummary && !succeededSummary) {
    conclusion = 'neutral'
    summary += 'This flake does not contain any buildable outputs.'
  }

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'completed',
    conclusion,
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

  const url = await githubFlakeUrl({ octokit, target })
  const { exitCode, jobs } = await evaluateJobs(url)

  if (exitCode > 0) {
    await publishError({ octokit, owner, repo, check_run_id })
    console.log(`Failed to evaluate ${job.id}`)
    return
  }

  await Promise.all(
    jobs
      .filter(evaluatedJob => !evaluatedJob.error)
      .map(evaluatedJob => createBuild({
        octokit,
        queue: buildQueue,
        target,
        fragment: evaluatedJob.attr,
        drvPath: evaluatedJob.drvPath
      }))
  )

  await publishStatus({ octokit, owner, repo, check_run_id, jobs })
  console.log(`Finished evaluation ${job.id}`)
}
