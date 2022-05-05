import { promises as fs } from 'fs'
import { removeANSI } from '../ansi.js'
import { runNix } from './nix.js'
import { withFile } from 'tmp-promise'

const BUILD_STORE = process.env.BUILD_STORE
const RESULT_STORES = JSON.parse(process.env.RESULT_STORES)

const CREATE_GC_ROOTS = BUILD_STORE == "auto"
const KEEP_GC_ROOTS = !RESULT_STORES

const systemError = /^error: a '\S+' with features {.*} is required to build '\S+'/m
function isSystemError(stderr) {
  return systemError.test(removeANSI(stderr))
}

function makeGcRoot(job) {
  const { owner, repo, head_branch, head_sha } = job.data.target
  const fragment = job.data.fragment.replace('/', '-')
  return `/var/lib/flakeaway/gc-roots/${owner}/${repo}/${head_branch}/${head_sha}/${fragment}`
}

async function evaluateFragment(url, fragment) {
  // Create a temporary file to hold the evaluation statistics
  return await withFile(async ({ path }) => {
    const evaluation = await runNix(
      [
        "eval",
        `${url}#${fragment}`,
        "--apply",
        "output: output.drvPath",
        "--raw"
      ],
      {
        NIX_SHOW_STATS: 1,
        NIX_SHOW_STATS_PATH: path,
        NIX_COUNT_CALLS: 1
      }
    )

    const statistics = JSON.parse(await fs.readFile(path))

    return {
      success: evaluation.exitCode == 0,
      logs: evaluation.stderr,
      drvPath: evaluation.stdout,
      statistics
    }
  })
}

async function buildFragment(url, fragment, drvPath, gcRoot) {
  // Some remote stores don't support building drvs directly
  const buildOptions = BUILD_STORE == "auto" ? [drvPath] : [`${url}#${fragment}`]

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
    await fs.unlink(outLink)
  }
}

export async function nixBuild(job, url, fragment) {
  console.log(`Evaluating ${job.id}`)
  const evaluation = await evaluateFragment(url, fragment)

  if (!evaluation.success) {
    return {
      success: false,
      systemError: isSystemError(evaluation.logs),
      log: evaluation.logs,
      statistics: evaluation.statistics
    }
  }

  const gcRoot = makeGcRoot(job)

  console.log(`Building ${job.id}`)
  const build = await buildFragment(url, fragment, evaluation.drvPath, gcRoot)

  if (build.success) {
    console.log(`Storing ${job.id}`)
    await storeFragment(job, evaluation.drvPath, gcRoot)
  }

  return {
    success: build.success,
    systemError: isSystemError(build.logs),
    log: evaluation.logs + build.logs,
    statistics: evaluation.statistics
  }
}