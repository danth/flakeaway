import { spawn } from "child_process";
import { runNix } from "./nix/nix.js";
import { decryptSecret } from "./config/secrets.js";

const BUILD_STORE = process.env.BUILD_STORE;

export async function cachixPush(store, drvPath) {
  // Convert the drv path into output path(s)
  const { stdout } = await runNix(["show-derivation", drvPath]);
  const derivations = JSON.parse(stdout);
  const outPaths = Object.values(derivations[drvPath].outputs).map((output) => output.path);

  // The outputs must be present locally to upload them to Cachix
  await runNix(["copy", drvPath, "--from", BUILD_STORE]);

  return new Promise((resolve, reject) => {
    const subprocess = spawn("cachix", ["push", store.store, ...outPaths], {
      detached: true, // Don't propagate SIGTERM, to allow graceful shutdown
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        CACHIX_AUTH_TOKEN: decryptSecret(store.authToken),
      },
    });

    subprocess.once("error", reject);
    subprocess.once("close", resolve);
  });
}
