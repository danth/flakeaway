import { promises as fs } from 'fs'
import { isSystemError } from '../log.js'
import { runNix } from './nix.js'

const BUILD_STORE = process.env.BUILD_STORE
const RESULT_STORES = JSON.parse(process.env.RESULT_STORES)

const CREATE_GC_ROOTS = BUILD_STORE == "auto"
const KEEP_GC_ROOTS = !RESULT_STORES

function makeGcRoot(job) {
  const { owner, repo, head_branch, head_sha } = job.data.target
  const fragment = job.data.fragment.replace('/', '-')
  return `/var/lib/flakeaway/gc-roots/${owner}/${repo}/${head_branch}/${head_sha}/${fragment}`
}

async function buildFragment(url, fragment, drvPath, gcRoot) {
  const buildOptions =
    // Some remote stores don't support building drvs directly
    // Re-runs will also require re-evaluation since we don't know the drv path
    drvPath && BUILD_STORE == "auto"
      ? [drvPath]
      : [`${url}#${fragment}`]

  const linkOptions = CREATE_GC_ROOTS ? ["--out-link", gcRoot] : ["--no-link"]

  const build = await runNix([
    "build",
    ...buildOptions,
    "--store", BUILD_STORE,
    "--eval-store", "auto",
    ...linkOptions
  ])

  return {
    success: build.exitCode == 0,
    logs: build.stderr
  }
}

async function storeFragment(job, drvPath, gcRoot) {
  for (const store of RESULT_STORES) {
    console.log(`Copying result of ${job.id} to ${store}`)
    await runNix([
      "copy",
      drvPath,
      "--from", BUILD_STORE,
      "--to", store
    ])
  }

  if (CREATE_GC_ROOTS && !KEEP_GC_ROOTS) {
    console.log(`Allowing result of ${job.id} to be garbage collected locally`)
    await fs.unlink(gcRoot)
  }
}

export async function nixBuild(job, url, fragment, drvPath) {
  const gcRoot = makeGcRoot(job)

  console.log(`Building ${job.id}`)
  const build = await buildFragment(url, fragment, drvPath, gcRoot)

  if (build.success) {
    console.log(`Storing ${job.id}`)
    await storeFragment(job, drvPath, gcRoot)
  }

  return {
    success: build.success,
    systemError: isSystemError(build.logs),
    log: build.logs
  }
}
