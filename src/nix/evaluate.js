import { spawn } from 'child_process'

export async function evaluateJobs(url) {
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

    var jobs = []
    subprocess.stdout.setEncoding('utf8')
    subprocess.stdout.on('data', data => jobs.push(JSON.parse(data)))

    subprocess.once('close', exitCode => {
      resolve({ exitCode, jobs })
    })
  })
}
