import { spawn } from 'child_process'
import _ from 'lodash'

const EVALUATE_HELPER = new URL('./evaluate.nix', import.meta.url).pathname

export async function runNixEvalJobs(url) {
  return new Promise((resolve, reject) => {
    const subprocess = spawn(
      "nix-eval-jobs",
      [
				EVALUATE_HELPER,
				"--verbose",
				"--argstr", "url", url
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
