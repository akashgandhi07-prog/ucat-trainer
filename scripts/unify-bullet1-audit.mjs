#!/usr/bin/env node
/**
 * Checklist item 1 helper: print remotes, current branch, and whether `skills-plan-unify`
 * exists locally or on remotes after `git fetch origin --prune` (and `git fetch upstream --prune`
 * when `upstream` is configured). Exit 0 always (informational); does not change branch or merge.
 */
import { spawnSync } from 'node:child_process'

function git(args, inherit = false) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  })
}

console.log('=== Unify bullet 1: Git quick audit ===\n')

const cur = git(['branch', '--show-current'])
console.log('Current branch:', (cur.stdout || '').trim() || '(unknown)')

const rv = git(['remote', '-v'])
console.log('\nRemotes:\n' + (rv.stdout || '').trim())

console.log('\nFetching origin (prune)…')
const fetch = git(['fetch', '--prune', 'origin'], true)
if (fetch.status !== 0) {
  console.warn('\nWARN: `git fetch origin` failed — branch list below may be stale.\n')
}

const unify = git(['branch', '-a', '--list', '*skills-plan-unify*'])
const u = (unify.stdout || '').trim()
console.log('\nBranches matching *skills-plan-unify*:')
console.log(u || '(none — create or fetch per docs/UNIFY_BULLET1_GIT.md)')

function remoteUrl(name) {
  const r = git(['remote', 'get-url', name])
  if (r.status !== 0) return ''
  return (r.stdout || '').trim()
}

function looksSkillsTrainer(url) {
  if (!url) return false
  return url.includes('TheUKCATPeople/skills-trainer') || url.includes('TheUKCATPeople%2Fskills-trainer')
}

function refExists(ref) {
  return git(['rev-parse', '-q', '--verify', ref]).status === 0
}

const url = remoteUrl('origin')
if (url) {
  if (!looksSkillsTrainer(url)) {
    console.warn(
      '\nNOTE: `origin` URL does not look like github.com/TheUKCATPeople/skills-trainer.\n' +
        'Add `upstream` and merge per docs/UNIFY_BULLET1_GIT.md before calling bullet 1 done.\n',
    )
  } else {
    console.log('\nOK: origin URL mentions canonical TheUKCATPeople/skills-trainer (verify in browser).\n')
  }
}

const up = remoteUrl('upstream')
if (up) {
  console.log('\nRemote `upstream` URL:\n' + up)
  if (looksSkillsTrainer(up)) {
    console.log('OK: upstream points at canonical skills-trainer (typical fork workflow).\n')
  } else {
    console.warn('NOTE: upstream does not look like TheUKCATPeople/skills-trainer — confirm before merge.\n')
  }
  console.log('Fetching upstream (prune)…')
  const upFetch = git(['fetch', '--prune', 'upstream'], true)
  if (upFetch.status !== 0) {
    console.warn('WARN: `git fetch upstream` failed — compare with upstream may be stale.\n')
  }
  if (refExists('refs/remotes/upstream/skills-plan-unify')) {
    console.log('OK: refs/remotes/upstream/skills-plan-unify exists.\n')
  } else {
    console.log('NOTE: upstream/skills-plan-unify not found yet (create on GitHub or fetch after it exists).\n')
  }
} else {
  console.log('\n(No `upstream` remote — optional; add per docs/UNIFY_BULLET1_GIT.md if `origin` is a fork.)\n')
}

if (refExists('refs/remotes/origin/skills-plan-unify')) {
  console.log('OK: refs/remotes/origin/skills-plan-unify exists.\n')
} else {
  console.log('NOTE: origin/skills-plan-unify not found (expected until branch is pushed to your `origin`).\n')
}

console.log('\nDone (informational only, exit 0).\n')
process.exit(0)
