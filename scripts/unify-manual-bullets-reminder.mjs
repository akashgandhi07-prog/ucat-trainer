#!/usr/bin/env node
/**
 * Prints playbook items that still require org access, deployed hosts, or manual QA.
 * Exit 0 always (informational). Does not call Supabase or mutate git.
 */
const rows = [
  ['1', 'Git / integration branch', 'docs/UNIFY_BULLET1_GIT.md', 'npm run unify:bullet1-audit'],
  ['3', 'RLS + advisor follow-ups in staging', 'docs/UNIFY_BULLET3_RLS_VERIFICATION.md', 'Supabase dashboard + browser'],
  ['4', 'Planner smoke (deployed)', 'docs/UNIFY_BULLET4_PLANNER_SMOKE.md', 'Browser on real planner URL'],
  ['5', 'Trainer smoke (deployed)', 'docs/UNIFY_BULLET5_TRAINER_APP.md', 'Browser + optional VITE_PLANNER_URL'],
  ['6', 'Ops: Auth URLs, redirects, rollback owners', 'docs/UNIFY_BULLET6_OPS_CUTOVER.md', 'Supabase Auth + hosting DNS'],
]

console.log('=== Unify: manual / org-only checklist (bullets 1, 3-6) ===\n')
console.log('These cannot be closed from CI alone. Evidence pack: docs/UNIFY_RELEASE_GATE_STATUS.md\n')
for (const [n, title, doc, hint] of rows) {
  console.log(`  ${n}. ${title}`)
  console.log(`     Runbook: ${doc}`)
  console.log(`     Hint:    ${hint}\n`)
}
console.log('Automated gate (bullets 2, 7-9 + compile): npm run unify:bullet2-verify-ci')
console.log('Fast SQL + git audit:                  npm run unify:merge-preflight\n')
