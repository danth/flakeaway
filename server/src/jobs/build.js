import { v4 as uuidv4 } from "uuid";
import { isSystemError } from "../log.js";
import { buildFragment, storeFragment, isSupportedSystem } from "../nix/build.js";
import { deserializeForge } from "../forges.js";

export async function createBuild({ forge, queue, fragment, drvPath }) {
  const id = uuidv4();

  if (!drvPath || await isSupportedSystem(drvPath)) {
    const check_id = await forge.createBuild(id, fragment);

    await queue.add(
      {
        forge: forge.serialize(),
        check_id,
        fragment,
        drvPath,
      },
      {
        jobId: id,
        removeOnFail: true,
        removeOnComplete: true,
      }
    );

    console.log(`Created build ${id}`);
  } else {
    // We know that we don't support the build, so skip the job immediately.
    await forge.createSkippedBuild(id, fragment);

    console.log(`Created skipped build ${id}`);
  }
}

export async function runBuild({ job }) {
  console.log(`Running build ${job.id}`);

  const forge = await deserializeForge(job.data.forge);
  const config = await forge.getConfig();

  await forge.beginBuild(job.data.check_id);

  const gcRoot = forge.gcRoot(job.data.fragment);

  console.log(`Building ${job.id}`);
  const build = await buildFragment(
    await forge.flake(),
    job.data.fragment,
    job.data.drvPath,
    gcRoot
  );

  if (build.success) {
    await forge.finishBuild(job.data.check_id, build.logs);
    console.log(`Finished build ${job.id}`);

    await storeFragment(job.id, job.data.drvPath, gcRoot, config);
  } else if (build.logs && isSystemError(build.logs.log)) {
    await forge.skipBuild(job.data.check_id, build.logs);
    console.log(`Skipped build ${job.id}`);
  } else {
    await forge.failBuild(job.data.check_id, build.logs);
    console.log(`Failed to build ${job.id}`);
  }
}
