import { promises as fs } from 'fs'
import { runNix } from './nix.js'
import { cachixPush } from '../cachix.js'

const BUILD_STORE = process.env.BUILD_STORE
const OUTPUT_STORES = JSON.parse(process.env.OUTPUT_STORES)

const CREATE_GC_ROOTS = BUILD_STORE == "auto"

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

export async function storeFragment(id, drvPath, gcRoot, config) {
  const configStores = config.outputStores || []
  const stores = [...OUTPUT_STORES, ...configStores]

  // TODO: Propagate upload errors to the user
  for (const store of stores) {
    if (store.type == 'cachix') {
      console.log(`Copying result of ${id} to ${store.store} on Cachix`)
      await cachixPush(store, drvPath)
    } else {
      console.log(`Copying result of ${id} to ${store.store}`)
      await runNix([
        "copy",
        drvPath,
        "--from", BUILD_STORE,
        "--to", store.store
      ])
    }
  }

  // If there is at least one remote store, don't pin outputs locally
  if (CREATE_GC_ROOTS && stores.length) {
    console.log(`Allowing result of ${id} to be garbage collected locally`)
    await fs.unlink(gcRoot)
  }
}
