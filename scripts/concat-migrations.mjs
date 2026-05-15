/**
 * Writes supabase/SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql from supabase/migrations/*.sql (root only, sorted).
 */
import { createWriteStream, readdirSync, readFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const migDir = join(root, 'supabase', 'migrations')
const outPath = join(root, 'supabase', 'SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql')

const files = readdirSync(migDir)
  .filter((n) => n.endsWith('.sql') && !n.startsWith('_'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const ws = createWriteStream(outPath, { encoding: 'utf8' })
ws.write(
  '-- Concatenation of supabase/migrations/*.sql (non-underscore) in sorted order.\n' +
    '-- For DBA review / greenfield apply; do not blindly re-run on prod with existing history.\n\n',
)
for (const name of files) {
  const p = join(migDir, name)
  if (!statSync(p).isFile()) continue
  ws.write(`\n-- ========== ${name} ==========\n`)
  ws.write(readFileSync(p, 'utf8'))
  ws.write('\n')
}
ws.end()
console.log('Wrote', outPath, '(' + files.length + ' files)')
