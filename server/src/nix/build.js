import { promises as fs } from "fs";
import { isSubset } from "@blakek/set-operations";
import { runNix } from "./nix.js";
import { cachixPush } from "../cachix.js";

const BUILD_STORE = process.env.BUILD_STORE;
const OUTPUT_STORES = JSON.parse(process.env.OUTPUT_STORES);

const CREATE_GC_ROOTS = BUILD_STORE == "auto";

function parseBuilders(systems, builders) {
  // Builders can either be separated by semicolons or newlines
  for (let builder of builders.split(/[;\n]/)) {
    builder = builder.trim();
    if (builder == "") {
      continue;
    }

    if (builder.startsWith("@")) {
      // @ indicates an import of another file
      const importedBuilders = fs.readFileSync(builder.slice(1));
      parseBuilders(systems, importedBuilders);
    } else {
      // The second space separated field is a comma separated list of systems
      const builderSystems = builder.split(/\s+/)[1].split(",");
      systems.add(...builderSystems);
    }
  }
}

export async function getSupportedSystems() {
  const systems = new Set();

  const { stdout } = await runNix(["show-config", "--json"]);
  const config = JSON.parse(stdout);

  systems.add(config.system.value);
  systems.add(...config["extra-platforms"].value);
  parseBuilders(systems, config.builders.value);

  return systems;
}

export async function getRequiredSystems(drvPath) {
  const { stdout } = await runNix(["show-derivation", "--recursive", drvPath]);
  const derivations = JSON.parse(stdout);

  const systems = new Set();
  for (const derivation of Object.values(derivations)) {
    if (derivation.system != "builtin") {
      systems.add(derivation.system);
    }
  }
  return systems;
}

export async function isSupportedSystem(drvPath) {
  const [requiredSystems, supportedSystems] =
    await Promise.all([getRequiredSystems(drvPath), getSupportedSystems()]);

  return isSubset(requiredSystems, supportedSystems);
}

export async function buildFragment(url, fragment, drvPath, gcRoot) {
  const buildOptions =
    // Some remote stores don't support building drvs directly
    // Re-runs will also require re-evaluation since we don't know the drv path
    drvPath && BUILD_STORE == "auto" ? [drvPath] : [`${url}#${fragment}`];

  const linkOptions = CREATE_GC_ROOTS ? ["--out-link", gcRoot] : ["--no-link"];

  const build = await runNix([
    "build",
    ...buildOptions,
    "--store",
    BUILD_STORE,
    "--eval-store",
    "auto",
    ...linkOptions,
  ]);

  return {
    success: build.exitCode == 0,
    logs: build.stderr,
  };
}

export async function storeFragment(id, drvPath, gcRoot, config) {
  const configStores = config.outputStores || [];
  const stores = [...OUTPUT_STORES, ...configStores];

  let keepRoot = false;

  // TODO: Propagate upload errors to the user
  for (const store of stores) {
    if (store.type == "cachix") {
      console.log(`Copying result of ${id} to ${store.store} on Cachix`);
      await cachixPush(store, drvPath);
    } else {
      if (store.store == "auto") { keepRoot = true; }

      console.log(`Copying result of ${id} to ${store.store}`);
      await runNix(["copy", drvPath, "--from", BUILD_STORE, "--to", store.store]);
    }
  }

  if (CREATE_GC_ROOTS && !keepRoot) {
    console.log(`Allowing result of ${id} to be garbage collected locally`);
    await fs.unlink(gcRoot);
  }
}
