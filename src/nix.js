const { spawn } = require('child_process')

async function runNix(args) {
  return new Promise((resolve, reject) => {
    const subprocess = spawn(
      "nix",
      ["-v", "--allow-import-from-derivation", ...args],
      { stdio: ['pipe', 'pipe', 'inherit'] }
    )

    subprocess.once('error', reject)

    var stdout = ""
    subprocess.stdout.setEncoding('utf8')
    subprocess.stdout.on('data', data => stdout += data)

    subprocess.once('close', exitCode => {
      resolve({ exitCode, stdout })
    })
  })
}

module.exports = { runNix }
