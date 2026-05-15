/**
 * Lightweight checks for unify-plan regression matrix items 2-3:
 * - Planner timetable must stay on `plan_sessions`, never trainer drill `sessions`.
 * - `uk/src` must not reference `.from('sessions')` (trainer drills belong elsewhere / future `/ucat` app routes).
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ukRoot = join(__dirname, '..')

function walkSrc(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walkSrc(p, acc)
    else if (['.ts', '.tsx', '.mjs', '.js'].includes(extname(name))) acc.push(p)
  }
  return acc
}

function main() {
  const tablesPath = join(ukRoot, 'src/lib/planner-db-tables.ts')
  const tables = readFileSync(tablesPath, 'utf8')
  const expected = "export const PLAN_TIMETABLE_TABLE = 'plan_sessions'"
  if (!tables.includes(expected)) {
    console.error(`FAIL: ${tablesPath} must contain exactly:\n  ${expected}`)
    process.exit(1)
  }

  const bad = []
  const srcRoot = join(ukRoot, 'src')
  for (const file of walkSrc(srcRoot)) {
    const text = readFileSync(file, 'utf8')
    if (/\.from\(\s*['"]sessions['"]\s*\)/.test(text)) {
      bad.push(file.replace(ukRoot + '/', ''))
    }
  }
  if (bad.length > 0) {
    console.error('FAIL: trainer drill table sessions must not be queried from uk planner src:')
    bad.forEach(f => console.error(`  - ${f}`))
    process.exit(1)
  }

  console.log('OK: plan_sessions isolation checks passed')
}

main()
