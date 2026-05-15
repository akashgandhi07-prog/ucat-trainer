/**
 * Exit with status 1 if any scanned path contains U+2013 (en dash) or U+2014 (em dash).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const BAD = /[\u2013\u2014]/

const SKIP_DIR = new Set([
  'node_modules',
  '.next',
  'out',
  'build',
  '.git',
])

const exts = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.md',
  '.css',
  '.sql',
  '.json',
])

async function walk(rel) {
  const full = path.join(root, rel)
  let st
  try {
    st = await fs.stat(full)
  } catch {
    return []
  }
  const out = []
  if (st.isFile()) {
    if (exts.has(path.extname(rel)) && BAD.test(await fs.readFile(full, 'utf8'))) {
      out.push(rel)
    }
    return out
  }
  if (!st.isDirectory()) return out
  const base = path.basename(full)
  if (SKIP_DIR.has(base)) return out
  const names = await fs.readdir(full)
  for (const name of names) {
    out.push(...await walk(path.join(rel, name)))
  }
  return out
}

const hits = [
  ...await walk('src'),
  ...await walk('supabase'),
  ...(await walk('.cursor')),
]

for (const f of ['AGENTS.md', 'CLAUDE.md', 'eslint.config.mjs', 'package.json']) {
  hits.push(...await walk(f))
}

const unique = [...new Set(hits)]
if (unique.length) {
  console.error('ASCII only: remove en dash (U+2013) and em dash (U+2014) from:')
  for (const p of unique.sort()) console.error(`  ${p}`)
  process.exit(1)
}
