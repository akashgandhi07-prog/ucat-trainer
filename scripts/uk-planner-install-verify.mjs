/**
 * Planner now lives inside the Vite trainer (`src/planner/embedded`).
 * CI gate: trainer migration guard + production build only.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('uk-planner-install-verify: unified app - running trainer unify:bullet1-guard')
run('npm', ['run', 'unify:bullet1-guard'])
console.log('uk-planner-install-verify: OK')
