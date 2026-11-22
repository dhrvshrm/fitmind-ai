// Runs the FastAPI backend from backend/venv, creating the venv on first run.
// Pass --install to (re)install requirements without starting the server.
import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'

const isWindows = process.platform === 'win32'
const backendDir = join(import.meta.dirname, '..', 'backend')
const venvPython = isWindows
  ? join(backendDir, 'venv', 'Scripts', 'python.exe')
  : join(backendDir, 'venv', 'bin', 'python')

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: backendDir, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function installRequirements() {
  run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements-dev.txt'])
}

if (!existsSync(venvPython)) {
  run(isWindows ? 'python' : 'python3', ['-m', 'venv', 'venv'])
  installRequirements()
} else if (process.argv.includes('--install')) {
  installRequirements()
}

// Restart the server if it stops on its own: uvicorn's reloader can exit on
// Windows when many files change at once, and with `concurrently -k` that
// would take the frontend down too. Ctrl+C and `concurrently` still stop it.
const RESTART_DELAY_MS = 2000

function serve() {
  let stopping = false
  let child

  const stop = (signal) => {
    stopping = true
    if (child && child.exitCode === null) child.kill(signal)
  }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))

  const start = () => {
    child = spawn(venvPython, ['main.py'], { cwd: backendDir, stdio: 'inherit' })
    child.on('exit', (code, signal) => {
      if (stopping || code === 0) process.exit(code ?? 0)
      console.log(`[backend] stopped (${signal ?? `exit ${code}`}); restarting in ${RESTART_DELAY_MS / 1000}s`)
      setTimeout(() => !stopping && start(), RESTART_DELAY_MS)
    })
  }
  start()
}

if (!process.argv.includes('--install')) {
  serve()
}
