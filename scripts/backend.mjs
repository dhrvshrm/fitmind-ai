// Runs the FastAPI backend from backend/venv, creating the venv on first run.
// Pass --install to (re)install requirements without starting the server.
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
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
  run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'])
}

if (!existsSync(venvPython)) {
  run(isWindows ? 'python' : 'python3', ['-m', 'venv', 'venv'])
  installRequirements()
} else if (process.argv.includes('--install')) {
  installRequirements()
}

if (!process.argv.includes('--install')) {
  run(venvPython, ['main.py'])
}
