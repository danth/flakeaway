import { spawn } from 'child_process'

/*
Evaluate all of the outputs of the flake at `url` simultaneously.

`jobsCallback`, which should be an async function, will be called
with information about each output, as it is produced.

Once all jobs have been evaluated and their callbacks have resolved,
the returned promise will resolve with an exit code.
Exit code 0 → Evaluation finished (but individual jobs may fail)
Exit code 1 → Evaluation failed (no jobs were evaluated)
*/
export async function evaluateJobs(url, jobCallback) {
  return new Promise((resolve, reject) => {
    const subprocess = spawn(
      "flakeaway-evaluator",
      [
        "--verbose",
        "--workers", process.env.EVALUATOR_WORKERS,
        "--max-memory-size", process.env.EVALUATOR_WORKER_MEMORY,
        url
      ],
      {
        detached: true, // Don't propagate SIGTERM, to allow graceful shutdown
        stdio: ['pipe', 'pipe', 'inherit'],
        env: process.env
      }
    )

    subprocess.once('error', reject)

    subprocess.stdout.setEncoding('utf8')

    const callbacks = []
    subprocess.stdout.on('data', data => {
      const parsedData = JSON.parse(data)
      callbacks.push(jobCallback(parsedData))
    })

    subprocess.once('close', exitCode => {
      Promise.all(callbacks).then(() => resolve(exitCode))
    })
  })
}
