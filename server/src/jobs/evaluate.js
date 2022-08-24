import { v4 as uuidv4 } from 'uuid'
import { createBuild } from './build.js'
import { evaluateJobs } from '../nix/evaluate.js'
import { isSystemError } from '../log.js'
import { deserializeForge } from '../forges.js'

export async function createEvaluation({ forge, queue }) {
  if (!forge.authorize()) {
    console.log(`Blocked ${forge.pseudoFlake()}`)
    return
  }

  const id = uuidv4()

  let check_id = await forge.createEvaluation(id)

  await queue.add({
    forge: forge.serialize(),
    check_id
  }, {
    jobId: id,
    priority: 1,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created evaluation ${id} for ${forge.pseudoFlake()}`)
}

function statusFailed(status, job) {
  if (isSystemError(job.error)) {
    status.systemErrors += 1
  } else {
    status.failed.push({ attr: job.attr, error: job.error })
  }
}

function statusSucceeded(status, job) {
  status.succeeded.push({ attr: job.attr })
}

export async function runEvaluation({ buildQueue, job }) {
  console.log(`Running evaluation ${job.id}`)

  const forge = await deserializeForge(job.data.forge)

  await forge.beginEvaluation(job.data.check_id)

  const status = {
    succeeded: [],
    failed: [],
    systemErrors: 0
  }

  const exitCode = await evaluateJobs(
    await forge.flake(),
    async evaluatedJob => {
      if (evaluatedJob.error) {
        statusFailed(status, evaluatedJob)
      } else {
        statusSucceeded(status, evaluatedJob)
        await createBuild({
          forge,
          queue: buildQueue,
          system: evaluatedJob.system,
          fragment: evaluatedJob.attr,
          drvPath: evaluatedJob.drvPath
        })
      }
    }
  )

  if (exitCode > 0) {
    await forge.failEvaluation(job.data.check_id)
  } else {
    await forge.finishEvaluation(job.data.check_id, status)
  }

  console.log(`Finished evaluation ${job.id}`)
}
