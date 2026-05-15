/**
 * Clean `uk/node_modules` + `uk/.next`, run `npm ci`, then lint + `next build` (TypeScript via Next).
 * Retries `npm ci` when the tree looks incomplete (macOS tar races, Gatekeeper, partial installs).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ukDir = join(__dirname, '..', 'uk')

const rmTreeOpts = { recursive: true, force: true, maxRetries: 20, retryDelay: 150 }

function run(cmd, args, extraEnv) {
  const r = spawnSync(cmd, args, {
    cwd: ukDir,
    stdio: 'inherit',
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  })
  if (r.error) {
    console.error(r.error)
    process.exit(1)
  }
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function sleepShort() {
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'ping 127.0.0.1 -n 2 >nul'], { stdio: 'ignore' })
    return
  }
  spawnSync('sh', ['-c', 'sleep 0.35'], { stdio: 'ignore' })
}

function shellRmRf(rel) {
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', `if exist "${rel}" rmdir /s /q "${rel}"`], {
      cwd: ukDir,
      stdio: 'inherit',
    })
    return
  }
  spawnSync('sh', ['-c', `chmod -R u+w "${rel}" 2>/dev/null; rm -rf "${rel}"`], {
    cwd: ukDir,
    stdio: 'inherit',
  })
}

function pruneStaleNukedNodeModules() {
  let entries
  try {
    entries = readdirSync(ukDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (!ent.isDirectory() || !ent.name.startsWith('node_modules.__nuked_')) continue
    try {
      rmSync(join(ukDir, ent.name), rmTreeOpts)
    } catch {
      /* best-effort */
    }
  }
}

/** On macOS, in-place `rm -rf node_modules` can leave ENOENT/ENOTEMPTY races; rename then delete is more reliable. */
function nukeNodeModulesDir() {
  const nm = join(ukDir, 'node_modules')
  if (!existsSync(nm)) return
  try {
    const nuked = join(ukDir, `node_modules.__nuked_${Date.now()}`)
    renameSync(nm, nuked)
    rmSync(nuked, rmTreeOpts)
  } catch {
    /* fall through to shell rm */
  }
}

/** Prefer POSIX `rm -rf` so `npm ci` never hits ENOTEMPTY on partial trees. */
function clean() {
  rmNextCiDirs()
  pruneStaleNukedNodeModules()
  nukeNodeModulesDir()
  const rels = ['node_modules', '.next', 'next.lock']
  if (process.platform !== 'win32') {
    const r = spawnSync('sh', ['-c', 'chmod -R u+w node_modules .next next.lock 2>/dev/null; rm -rf node_modules .next next.lock'], {
      cwd: ukDir,
      stdio: 'inherit',
    })
    if (r.error) {
      console.error(r.error)
      process.exit(1)
    }
    sleepShort()
    if (!rels.some((rel) => existsSync(join(ukDir, rel)))) return
  }
  for (let round = 0; round < 10; round++) {
    for (const rel of rels) {
      const p = join(ukDir, rel)
      if (!existsSync(p)) continue
      try {
        rmSync(p, rmTreeOpts)
      } catch {
        /* next round */
      }
    }
    const still = rels.some((rel) => existsSync(join(ukDir, rel)))
    if (!still) return
    sleepShort()
  }
  for (const rel of rels) {
    const p = join(ukDir, rel)
    if (!existsSync(p)) continue
    shellRmRf(rel)
    sleepShort()
  }
  for (const rel of rels) {
    const p = join(ukDir, rel)
    if (!existsSync(p)) continue
    console.error(`uk-planner-install-verify: could not fully remove ${rel} after repeated tries`)
    process.exit(1)
  }
}

function rmNextCiDirs() {
  if (!existsSync(ukDir)) return
  let entries
  try {
    entries = readdirSync(ukDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    if (!ent.name.startsWith('.next-ci-')) continue
    try {
      rmSync(join(ukDir, ent.name), rmTreeOpts)
    } catch {
      /* best-effort */
    }
  }
}

function wipeBuildOutput() {
  rmNextCiDirs()
  for (const rel of ['.next', 'next.lock']) {
    const p = join(ukDir, rel)
    if (!existsSync(p)) continue
    try {
      rmSync(p, rmTreeOpts)
    } catch {
      /* best-effort */
    }
  }
  if (process.platform !== 'win32') {
    spawnSync('sh', ['-c', 'chmod -R u+w .next next.lock node_modules/.cache 2>/dev/null; rm -rf .next next.lock node_modules/.cache'], {
      cwd: ukDir,
      stdio: 'ignore',
    })
    sleepShort()
  }
  const tsbi = join(ukDir, 'tsconfig.tsbuildinfo')
  if (existsSync(tsbi)) {
    try {
      rmSync(tsbi, { force: true })
    } catch {
      /* best-effort */
    }
  }
}

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function npxCmd() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

/** True when `next` + eslint deps look complete enough for lint + `next build`. */
function installOk() {
  const nextRoot = join(ukDir, 'node_modules', 'next')
  if (!existsSync(join(nextRoot, 'package.json'))) return false
  if (!existsSync(join(nextRoot, 'dist', 'build', 'index.js'))) return false
  const babelDir = join(nextRoot, 'dist', 'compiled', 'babel-packages')
  if (
    !existsSync(join(babelDir, 'packages-bundle.js')) &&
    !existsSync(join(babelDir, 'package.json'))
  ) {
    return false
  }
  if (!existsSync(join(ukDir, 'node_modules', 'eslint', 'package.json'))) return false
  if (!existsSync(join(ukDir, 'node_modules', 'eslint-config-next', 'package.json'))) return false
  if (process.platform === 'darwin') {
    const nextScoped = join(ukDir, 'node_modules', '@next')
    if (!existsSync(nextScoped)) return false
    let okSwc = false
    for (const name of readdirSync(nextScoped)) {
      if (!name.startsWith('swc-darwin-')) continue
      const dir = join(nextScoped, name)
      let files
      try {
        files = readdirSync(dir)
      } catch {
        continue
      }
      if (files.some((f) => f.endsWith('.node'))) {
        okSwc = true
        break
      }
    }
    if (!okSwc) return false
  }
  if (!nextPrimaryModulesResolvable()) return false
  return true
}

/** `npm` can exit 0 while `next` is still missing subpaths `tsc` needs (tar races). */
function nextPrimaryModulesResolvable() {
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      "require.resolve('next/navigation'); require.resolve('next/server'); require.resolve('next/link'); require.resolve('@supabase/ssr');",
    ],
    { cwd: ukDir, stdio: 'ignore' },
  )
  return r.status === 0
}

/** Corrupted tarballs can leave `eslint`/`next` half-installed while key paths still exist. */
function toolchainSmokeOk() {
  const rEslint = spawnSync(npxCmd(), ['eslint', '--version'], {
    cwd: ukDir,
    stdio: 'pipe',
  })
  if (rEslint.status !== 0) return false
  const rNext = spawnSync(npxCmd(), ['--no-install', 'next', '--version'], {
    cwd: ukDir,
    stdio: 'pipe',
  })
  return rNext.status === 0
}

/** `eslint --version` does not load flat-config plugins; tar races can omit transitive deps used by `eslint .`. */
function eslintProjectBootOk() {
  const cfg = join(ukDir, 'eslint.config.mjs')
  if (!existsSync(cfg)) return true
  const r = spawnSync(npxCmd(), ['eslint', cfg], {
    cwd: ukDir,
    stdio: 'ignore',
  })
  return r.status === 0
}

/** Re-fetch native SWC when `npm ci` left `@next/swc-darwin-*` empty (tar race on macOS). */
function repairDarwinSwcIfNeeded() {
  if (process.platform !== 'darwin') return
  const nextScoped = join(ukDir, 'node_modules', '@next')
  if (!existsSync(nextScoped)) return
  let need = false
  for (const name of readdirSync(nextScoped)) {
    if (!name.startsWith('swc-darwin-')) continue
    const dir = join(nextScoped, name)
    let files
    try {
      files = readdirSync(dir)
    } catch {
      need = true
      break
    }
    if (!files.some((f) => f.endsWith('.node'))) {
      need = true
      break
    }
  }
  if (!need) return
  let version = ''
  try {
    const raw = readFileSync(join(ukDir, 'node_modules', 'next', 'package.json'), 'utf8')
    version = JSON.parse(raw).version || ''
  } catch {
    return
  }
  if (!version) return
  console.error('\nuk-planner-install-verify: repairing incomplete @next/swc-darwin-* (npm ci tar race).\n')
  run(npmCmd(), ['install', '--no-save', `@next/swc-darwin-arm64@${version}`])
  run(npmCmd(), ['run', 'postinstall'])
}

function npmCiWithRetries() {
  const repoRoot = join(__dirname, '..')
  const legacyCache = join(repoRoot, '.npm-uk-ci-cache')
  if (existsSync(legacyCache)) {
    try {
      rmSync(legacyCache, rmTreeOpts)
    } catch {
      /* best-effort */
    }
  }
  const max = 5
  for (let attempt = 1; attempt <= max; attempt++) {
    if (attempt > 1) {
      console.error(`\nuk-planner-install-verify: npm ci retry ${attempt}/${max} after failure or incomplete install.\n`)
    }
    clean()
    if (process.platform !== 'win32') {
      spawnSync('sync', [], { stdio: 'ignore' })
      spawnSync('sh', ['-c', 'sleep 0.75'], { stdio: 'ignore' })
    }
    const cacheDir = mkdtempSync(join(tmpdir(), 'uk-planner-npm-ci-'))
    let installArgs
    if (attempt === max) {
      console.error(
        '\nuk-planner-install-verify: final attempt uses `npm install` (respects package-lock) instead of `npm ci` after repeated install races.\n',
      )
      installArgs = ['install', '--no-audit', '--no-fund', '--prefer-online', '--cache', cacheDir]
    } else {
      installArgs = ['ci', '--cache', cacheDir]
      if (attempt > 1) installArgs.push('--prefer-online')
    }
    const devTmp = tmpdir()
    const r = spawnSync(npmCmd(), installArgs, {
      cwd: ukDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_devdir: devTmp,
        npm_config_maxsockets: '1',
        npm_config_jobs: '1',
        npm_config_fetch_retries: '7',
        npm_config_fetch_retry_mintimeout: '20000',
        npm_config_cache: cacheDir,
        NPM_CONFIG_CACHE: cacheDir,
      },
    })
    try {
      rmSync(cacheDir, rmTreeOpts)
    } catch {
      /* best-effort */
    }
    if (r.error) {
      console.error(r.error)
      process.exit(1)
    }
    if (r.status !== 0) {
      if (attempt < max) {
        console.error(
          `\nuk-planner-install-verify: install step exited ${r.status}; retrying (${attempt + 1}/${max}).\n`,
        )
        sleepShort()
        continue
      }
      process.exit(r.status ?? 1)
    }
    run(npmCmd(), ['run', 'postinstall'])
    repairDarwinSwcIfNeeded()
    if (installOk() && toolchainSmokeOk() && eslintProjectBootOk()) return
    if (attempt < max) {
      console.error(
        `\nuk-planner-install-verify: postinstall finished but install looks incomplete; retrying (${attempt + 1}/${max}).\n`,
      )
      sleepShort()
    }
  }
  console.error('uk-planner-install-verify: uk install failed after retries (tree still incomplete or toolchain smoke failed).')
  process.exit(1)
}

if (!process.env.SKIP_UK_NPM_CI) {
  npmCiWithRetries()
} else {
  console.warn('uk-planner-install-verify: SKIP_UK_NPM_CI set — skipping npm ci (use only when node_modules already populated).')
  rmNextCiDirs()
  wipeBuildOutput()
  run(npmCmd(), ['run', 'postinstall'])
  if (!installOk() || !toolchainSmokeOk() || !eslintProjectBootOk()) {
    console.error(
      'uk-planner-install-verify: SKIP_UK_NPM_CI but uk/node_modules looks incomplete for lint/build — run npm ci in uk/ first.',
    )
    process.exit(1)
  }
}

run(npmCmd(), ['run', 'lint'])
run(npxCmd(), ['tsc', '--noEmit'])
wipeBuildOutput()

const buildEnv = { ...process.env }
delete buildEnv.NEXT_CI_DIST_DIR

const rBuild = spawnSync(npmCmd(), ['run', 'build'], {
  cwd: ukDir,
  stdio: 'inherit',
  env: buildEnv,
})
if (rBuild.status !== 0) process.exit(rBuild.status ?? 1)
run(process.execPath, [join(ukDir, 'scripts', 'strip-next-ci-tsconfig.mjs')])
