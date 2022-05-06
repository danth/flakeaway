import { markdownTable } from 'markdown-table'
import { v4 as uuidv4 } from 'uuid'
import { githubFlakeUrl, reducePayload } from '../github.js'
import { nixBuild } from '../nix/build.js'
import { formatLog } from '../log.js'

export async function createBuild({ octokit, queue, target, fragment, drvPath }) {
  const id = uuidv4()
  const { owner, repo, head_sha } = target

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: `Build ${fragment}`,
    status: 'queued',
  })

  await queue.add({
    target, fragment, drvPath,
    check_run_id: check_run.data.id,
  }, {
    jobId: id,
    priority: 2,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created build ${id}`)
}

export async function rerequestBuild({ octokit, payload, queue }) {
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

export async function runBuild({ app, job }) {
  console.log(`Running build ${job.id}`)

  const { owner, repo, installation_id } = job.data.target
  const { fragment, drvPath, check_run_id } = job.data
  const octokit = await app.getInstallationOctokit(installation_id)
  const url = await githubFlakeUrl({ octokit, target: job.data.target })

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const result = await nixBuild(job, url, fragment, drvPath)

  const { success, systemError } = result
  const log = formatLog(result.log)

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
  } else if (systemError) {
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
