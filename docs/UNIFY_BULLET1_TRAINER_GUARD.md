# Unify plan bullet 1: Vite trainer guard (production-canonical until flip)

This document closes **bullet 1** from the unify plan in an actionable, repeatable way.

## Intent

1. **Vite trainer stays the production UX** until a deliberate Next cutover (no surprise swap).
2. **After each DDL batch** affecting Supabase, run a **cheap trainer smoke** before you call the deploy “good”.
3. **Forbid accidental breaking migrations** on the trainer spine (`public.sessions` for drills, `public.profiles`, etc.) without an explicit, reviewed change.
4. **Next-route migration** stays **postponed** until the parity checklist in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`** is green (manual gate, not automated).

## Commands (local)

From the **repo root** (Vite trainer):

```bash
npm run unify:bullet1-guard
```

This runs, in order:

1. **`npm run unify:check-migrations`** – fails `supabase/migrations` that look like they **drop / truncate / strip columns from** core trainer tables (see script header).
2. **`npm run unify:trainer-smoke`** – `eslint` + production **`tsc -b`** + **`vite build`** for the trainer shell.

Optional: typecheck only the nested planner:

```bash
npm run unify:planner-typecheck
```

## When to run

- **Before merging** any PR that touches **`supabase/migrations/**`** or shared trainer **`src/**`** on **`skills-plan-unify`** (or before push, if you prefer).
- **After applying** a migration batch to **staging** (or production): run the same npm scripts against the branch you deployed, then do a **short manual pass** (sign in, open a drill, write a session row if you use Supabase for that path).

The npm scripts are a **CI surrogate**, not a full E2E suite. They catch compile breaks and obvious schema foot-guns; they do not replace production monitoring.

## CI

Workflow **`.github/workflows/trainer-unify-guard.yml`** runs **`npm run unify:bullet2-verify-ci`** (trainer **`unify:bullet1-guard`** plus clean **`uk/`** `npm ci`, lint, `tsc`, and `next build`). See **`docs/UNIFY_BULLET8_CI_PARITY.md`** for how this maps to checklist items **8–9**.

## Parity / Next gate (manual)

Do **not** delete or rewrite trainer routes into Next until **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`** checklist for **`skills-plan-unify` → `main`** (including planner smoke and API scoping) is satisfied. This repo does not auto-enforce that gate; maintainers tick it at release time.

## Related docs

- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
- [`UNIFY_BULLET1_GIT.md`](UNIFY_BULLET1_GIT.md) (checklist item 1: branch hygiene)
- [`UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md) (checklist items 8–9: CI + schedule)
- [`UNIFY_BULLET5_TRAINER_APP.md`](UNIFY_BULLET5_TRAINER_APP.md) (bullet 5: trainer merge readiness + manual smoke)
- [`UNIFY_BULLET6_OPS_CUTOVER.md`](UNIFY_BULLET6_OPS_CUTOVER.md) (bullet 6: ops, redirects, rollback)
- [`UNIFY_BULLET7_ADVISORS.md`](UNIFY_BULLET7_ADVISORS.md) (bullet 7: Supabase advisors triage)
- [`SKILLS_ADDITIVE_PLANNER_DDL.md`](SKILLS_ADDITIVE_PLANNER_DDL.md) (bullet 2: apply planner DDL on Skills)
- [`SKILLS_PLAN_UNIFY_ENV.md`](SKILLS_PLAN_UNIFY_ENV.md)
- [`ACCESS_RLS_MATRIX.md`](ACCESS_RLS_MATRIX.md)
