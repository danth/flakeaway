import { promises as fs } from 'fs'
import { removeANSI } from '../ansi.js'
import { runNix } from './nix.js'
import { withFile } from 'tmp-promise'

const systemError = /^error: a '\S+' with features {.*} is required to build '\S+'/m
function isSystemError(stderr) {
  return systemError.test(removeANSI(stderr))
}

function makeOutLink(job) {
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
        NIX_SHOW_STATS_PATH: path
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

async function buildFragment(drvPath, outLink) {
  const build = await runNix(["build", drvPath, "--out-link", outLink])

  return {
    success: build.exitCode == 0,
    logs: build.stderr
  }
}

async function storeFragment(job, drvPath, outLink) {
  const stores = JSON.parse(await fs.readFile(process.env.REMOTE_STORES, 'utf-8'));

  for (const store of stores) {
    console.log(`Pushing result of ${job.id} to ${store}`)
    await runNix(["copy", "--to", store, drvPath])
  }

  if (stores) {
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

  const outLink = makeOutLink(job)

  console.log(`Building ${job.id}`)
  const build = await buildFragment(evaluation.drvPath, outLink)

  if (build.success) {
    console.log(`Storing ${job.id}`)
    await storeFragment(job, evaluation.drvPath, outLink)
  }

  return {
    success: build.success,
    systemError: isSystemError(build.logs),
    log: evaluation.logs + build.logs,
    statistics: evaluation.statistics
  }
}
