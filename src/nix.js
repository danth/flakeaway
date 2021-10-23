const { spawn } = require('child_process')

async function runNix(args) {
  return new Promise((resolve, reject) => {
    const subprocess = spawn(
      "nix",
      ["-v", "--allow-import-from-derivation", ...args],
      {
        detached: true, // Don't propagate SIGTERM, to allow graceful shutdown
        stdio: ['pipe', 'pipe', 'pipe']
      }
    )

    subprocess.once('error', reject)

    var stdout = ""
    subprocess.stdout.setEncoding('utf8')
    subprocess.stdout.on('data', data => stdout += data)

    var stderr = ""
    subprocess.stderr.setEncoding('utf8')
    subprocess.stderr.on('data', data => {
      stderr += data
      console.log(data)
    })

    subprocess.once('close', exitCode => {
      resolve({ exitCode, stdout, stderr })
    })
  })
}

module.exports = { runNix }
