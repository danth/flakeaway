import { promises as fs } from 'fs'
import { runNix } from './nix.js'

const BUILD_STORE = process.env.BUILD_STORE
const RESULT_STORES = JSON.parse(process.env.RESULT_STORES)

const CREATE_GC_ROOTS = BUILD_STORE == "auto"
const KEEP_GC_ROOTS = !RESULT_STORES

export async function buildFragment(url, fragment, drvPath, gcRoot) {
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

export async function storeFragment(id, drvPath, gcRoot) {
  for (const store of RESULT_STORES) {
    console.log(`Copying result of ${id} to ${store}`)
    await runNix([
      "copy",
      drvPath,
      "--from", BUILD_STORE,
      "--to", store
    ])
  }

  if (CREATE_GC_ROOTS && !KEEP_GC_ROOTS) {
    console.log(`Allowing result of ${id} to be garbage collected locally`)
    await fs.unlink(gcRoot)
  }
}
