import { v4 as uuidv4 } from 'uuid'
import { createBuild } from './build.js'
import { getBuildableFragments, readFlake } from '../nix/flake.js'
import { githubFlakeUrl, reducePayload } from '../github.js'

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

  await queue.add('evaluation', {
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

export async function runEvaluation({ app, job }) {
  console.log(`Running evaluation ${job.id}`)

  const { target, check_run_id } = job.data
  const { owner, repo, installation_id } = target

  const octokit = await app.getInstallationOctokit(installation_id)

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const url = await githubFlakeUrl({ octokit, target })
  const flake = await readFlake(url)

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

  await Promise.all(fragments.map(
    fragment => createBuild({ octokit, queue: job.queue, target, fragment })
  ))

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

  console.log(`Finished evaluation ${job.id}`)
}
