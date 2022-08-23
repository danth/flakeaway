import { markdownTable } from 'markdown-table'
import { v4 as uuidv4 } from 'uuid'
import { isSystemError } from '../log.js'
import { buildFragment, storeFragment } from '../nix/build.js'
import { deserializeForge } from '../forges.js'

export async function createBuild({ forge, queue, fragment, drvPath }) {
  const id = uuidv4()

  const check_id = await forge.createBuild(id, fragment)

  await queue.add({
    forge: forge.serialize(),
    check_id, fragment, drvPath
  }, {
    jobId: id,
    priority: 2,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created build ${id}`)
}

export async function rerequestBuild({ forge, queue, fragment }) {
  await createBuild({
    forge: forge.serialize(),
    queue, fragment
  })
}

export async function runBuild({ job }) {
  console.log(`Running build ${job.id}`)

  const forge = await deserializeForge(job.data.forge)

  await forge.beginBuild(job.data.check_id)

  const gcRoot = forge.gcRoot(job.data.fragment)

  console.log(`Building ${job.id}`)
  const build = await buildFragment(
    await forge.flake(),
    job.data.fragment,
    job.data.drvPath,
    gcRoot
  )

  if (build.success) {
    await forge.finishBuild(job.data.check_id, build.logs)
    console.log(`Finished build ${job.id}`)

    await storeFragment(job.id, job.data.drvPath, gcRoot)
  } else if (isSystemError(build.logs)) {
    await forge.skipBuild(job.data.check_id, build.logs)
    console.log(`Skipped build ${job.id}`)
  } else {
    await forge.failBuild(job.data.check_id, build.logs)
    console.log(`Failed to build ${job.id}`)
  }
}
