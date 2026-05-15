## Summary

<!-- What this PR changes and why (1-3 sentences). -->

## Unify / cutover checklist (tick when applicable)

Use for **`skills-plan-unify` → `main`** or any PR that ships planner + trainer together. See [`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`](docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md).

- [ ] **1. Git:** Intended commits are on the integration branch you will merge (no critical work only on side branches). Run **`npm run unify:bullet1-audit`** (read-only). See [`docs/UNIFY_BULLET1_GIT.md`](docs/UNIFY_BULLET1_GIT.md).
- [ ] **2. Database:** Planner DDL applied or confirmed on target envs; `plan_sessions` + `profiles.planner_role` present; trainer tables backward compatible. If tutors act on student plans from the planner UI, apply **`031_tutor_linked_writes_rls`** (or equivalent policies) so RLS matches API guards.
- [ ] **3. RLS:** Matrix scenarios smoke-tested or exceptions documented ([`docs/ACCESS_RLS_MATRIX.md`](docs/ACCESS_RLS_MATRIX.md), [`docs/UNIFY_BULLET3_RLS_VERIFICATION.md`](docs/UNIFY_BULLET3_RLS_VERIFICATION.md)).
- [ ] **4. Planner:** Deployed smoke (OTP, onboarding, plan, completion, tutor invite as applicable) + API `plan_id` scoping reviewed.
- [ ] **5. Trainer:** Guest + signed-in smoke per [`docs/UNIFY_BULLET5_TRAINER_APP.md`](docs/UNIFY_BULLET5_TRAINER_APP.md); `npm run unify:bullet5-verify` green.
- [ ] **6. Ops:** Auth redirect URLs, env parity, rollback owners per [`docs/UNIFY_BULLET6_OPS_CUTOVER.md`](docs/UNIFY_BULLET6_OPS_CUTOVER.md).
- [ ] **7. Advisors:** Triage logged in [`docs/UNIFY_BULLET7_ADVISORS.md`](docs/UNIFY_BULLET7_ADVISORS.md) (or follow-ups filed). Optional debt: [`docs/UNIFY_MAINTENANCE_BACKLOG.md`](docs/UNIFY_MAINTENANCE_BACKLOG.md).
- [ ] **8. CI:** `npm run unify:bullet2-verify-ci` passes locally (full gate). For a **quick** Git + migrations + submit-SQL refresh without reinstalling **`uk/`**, run **`npm run unify:merge-preflight`**. See [`docs/UNIFY_BULLET8_CI_PARITY.md`](docs/UNIFY_BULLET8_CI_PARITY.md).
- [ ] **9. Scheduled gate:** [`unify-scheduled-verify.yml`](.github/workflows/unify-scheduled-verify.yml) (cron + `workflow_dispatch` + path-filtered **push**). [`trainer-unify-guard.yml`](.github/workflows/trainer-unify-guard.yml) also runs the same verify on **every** push to `main` / `skills-plan-unify`. See [`docs/UNIFY_BULLET8_CI_PARITY.md`](docs/UNIFY_BULLET8_CI_PARITY.md).

## Test plan

<!-- How reviewers can verify (commands, URLs, test accounts). -->

```bash
npm run unify:merge-preflight   # git audit + migration guard + SUBMIT_ALL SQL (no uk reinstall)
npm run unify:manual-bullets    # prints org-only bullets 1 + 3-6 (stdout)
npm run unify:bullet2-verify-ci # full gate (includes trainer + clean uk install + next build)
```
