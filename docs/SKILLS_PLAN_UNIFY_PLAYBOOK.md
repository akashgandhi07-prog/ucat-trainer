# Skills + planner unification playbook (maintainers)

This document describes how **skills-trainer** and the nested **Next.js planner** under **`uk/`** are meant to converge on one Supabase backend, how work should land on GitHub, and what to verify before promoting the integration branch to **main**.

## Does everything on `skills-plan-unify` become `main` after one merge?

**Yes, for whatever is actually committed on that branch.** When **`skills-plan-unify`** is merged into **`main`**, Git history carries every commit that is reachable from the merge. So all PRs (yours, agents, cherry-picks) that were **merged into `skills-plan-unify`** will appear on **`main`** after the cutover PR.

**Partially / not automatically:** Work that never merged (local-only changes, open PRs targeting another branch, or commits on forks that were not integrated) does **not** ride along. You must ensure each stream of work is merged **into `skills-plan-unify`** (or rebased onto it) before the final PR to **`main`**.

**Historical planner repo:** **GitShanks/UCAT-Planner-App** is parallel history. Treat the **`uk/`** tree inside **TheUKCATPeople/skills-trainer** as **canonical**. Port missing commits via merge or cherry-pick into **`skills-plan-unify`**, preserving paths under **`uk/`**.

## Bullet 2: additive planner on Skills (DDL)

Operational guide: **[`docs/SKILLS_ADDITIVE_PLANNER_DDL.md`](SKILLS_ADDITIVE_PLANNER_DDL.md)** (which file to apply, auth trigger caveat, post-apply smoke, scratch files to ignore).

## Bullet 1 complete in repo (trainer guard)

Bullet **vite-trainer-guardrail** is satisfied in this codebase by **automation + docs**, not by changing product UX:

- **`npm run unify:bullet1-guard`** - migration safety scan + trainer lint/build (see **`docs/UNIFY_BULLET1_TRAINER_GUARD.md`**).
- **Git (checklist item 1)** - branch and merge hygiene: **`docs/UNIFY_BULLET1_GIT.md`**.
- **GitHub Actions** - **`.github/workflows/trainer-unify-guard.yml`** runs **`npm run unify:bullet2-verify-ci`** on relevant PRs and on pushes to **`main`** / **`skills-plan-unify`** (clean **`uk/`** install). See **`docs/UNIFY_BULLET8_CI_PARITY.md`** for bullets **8-9**.
- **Next cutover** remains a **manual checklist** gate in this document until parity is green.

## Canonical layout

| Location | Role |
| --- | --- |
| **TheUKCATPeople/skills-trainer** | Single product repo: Vite trainer at repo root, planner at **`uk/`** |
| **`uk/`** | Next.js app (App Router, `@supabase/ssr`). Same dependencies and source layout as the old standalone planner, but paths stay under **`uk/`** |
| **Skills Supabase project** | Canonical database: **`profiles`**, trainer drill **`sessions`**, planner **`plan_sessions`**, **`plans`**, RLS, RPCs |

## Branch flow (recommended)

1. **Integration branch:** **`skills-plan-unify`** on **skills-trainer** absorbs trainer changes, planner **`uk/`** changes, and additive Supabase migrations.
2. **Optional:** Bring **GitShanks/your-choice-of-branch** into **`skills-plan-unify`** with path prefix **`uk/`** (merge, subtree, or manual cherry-pick).
3. **Cutover:** Open **`skills-plan-unify` → `main`** when the checklist below is satisfied.

Local clones may use different remotes or still be on **`main`**; always confirm with:

```bash
git remote -v
git branch --show-current
```

before pushing. Intended integration work should target **`skills-plan-unify`** on **TheUKCATPeople/skills-trainer**.

## Database naming (unified)

- **Trainer drill telemetry:** `public.sessions` (unchanged name on Skills DB).
- **Planner timetable rows:** `public.plan_sessions` (never reuse `sessions` for the planner).
- **Identity:** `public.profiles` with **`planner_role`** (`student` | `tutor` | null) for planner routing; **`profiles.role`** remains the trainer axis (`user`, `admin`, etc.).

See **`docs/ACCESS_RLS_MATRIX.md`** for route and RLS expectations.

## Application wiring

- **Trainer:** optional header link **Study plan** when **`VITE_PLANNER_URL`** is set (absolute URL to the deployed Next app, for example the **`uk`** deployment). Omitted in env means the link is hidden. See **`docs/SKILLS_PLAN_UNIFY_ENV.md`** for a full env table.
- **Planner (`uk/`):** table name constants in **`uk/src/lib/planner-db-tables.ts`** (`plan_sessions`, `profiles`).

Legacy **`uk/supabase/schema.sql`** is labeled as **standalone / historical**; production Skills should follow repo-root migrations (for example additive planner migrations alongside trainer migrations).

## Contributor notes for agents and parallel PRs

- Prefer **small PRs** into **`skills-plan-unify`**: migrations + matching **`uk/`** query updates, or trainer-only changes, to keep review and rollback simple.
- After DDL batches: run Supabase advisors, smoke anon and authenticated journeys, and confirm trainer **`sessions`** still write as before.
- **Route handlers** under **`uk/src/app/api/`** must verify the caller may touch the **`plan_id`** (student owner, declared tutor membership, or stricter) before calling **`regenerateFutureWeeks`**, **`createPlan`**, or other mutating helpers. RLS is not a substitute for obvious **IDOR** holes in server routes.

---

## Checklist before merging **`skills-plan-unify` → `main`**

Use this as a release gate; adjust rows if your rollout adds feature flags.

**Evidence pack (what an agent can record vs what you must still do):** [`docs/UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md).

1. **Git:** All intended work is **merged into `skills-plan-unify`** (no critical commits only on side branches). Operational guide: **[`docs/UNIFY_BULLET1_GIT.md`](UNIFY_BULLET1_GIT.md)**. Quick audit (read-only): **`npm run unify:bullet1-audit`** (`git fetch origin`; if **`upstream`** exists, **`git fetch upstream`** and checks for **`origin/skills-plan-unify`** / **`upstream/skills-plan-unify`**).
2. **Database:** Planner migrations applied on staging (or branch) per **`docs/SKILLS_ADDITIVE_PLANNER_DDL.md`**; **`plan_sessions`** and **`profiles.planner_role`** exist; trainer tables unchanged or backward compatible.
3. **RLS:** Tutor and student paths tested; **`docs/ACCESS_RLS_MATRIX.md`** scenarios pass or documented exceptions. Advisor snapshot and tables: **[`docs/UNIFY_BULLET3_RLS_VERIFICATION.md`](UNIFY_BULLET3_RLS_VERIFICATION.md)**.
4. **Planner app:** **`uk/`** build and smoke: login, onboarding, plan view, completion API, tutor invite (as applicable). Spot-check **`/api/*`** routes for plan scoping (no **IDOR** on **`planId`**). Runbook: **[`docs/UNIFY_BULLET4_PLANNER_SMOKE.md`](UNIFY_BULLET4_PLANNER_SMOKE.md)**.
5. **Trainer app:** Production build green; guest drills and dashboard still work against the same Supabase URL or documented dual-env plan. Operational guide: **[`docs/UNIFY_BULLET5_TRAINER_APP.md`](UNIFY_BULLET5_TRAINER_APP.md)** (`npm run unify:bullet5-verify` + manual smoke).
6. **Ops:** Redirects, environment parity per **`docs/SKILLS_PLAN_UNIFY_ENV.md`**, Supabase auth redirect allowlist, and rollback steps (revert merge or DNS) are documented for the team. Operational guide: **[`docs/UNIFY_BULLET6_OPS_CUTOVER.md`](UNIFY_BULLET6_OPS_CUTOVER.md)**.
7. **Advisors:** Mailchimp or other open advisor items triaged (may ship as follow-ups if explicitly accepted). Runbook and triage table: **[`docs/UNIFY_BULLET7_ADVISORS.md`](UNIFY_BULLET7_ADVISORS.md)**. Optional debt: **[`docs/UNIFY_MAINTENANCE_BACKLOG.md`](UNIFY_MAINTENANCE_BACKLOG.md)**.
8. **CI reproducibility:** Hosted CI must run a **clean `uk/` install** via **`node scripts/uk-planner-install-verify.mjs`** (invoked by **`npm run unify:planner-install-and-verify`**) so CI matches a fresh clone. From repo root use **`npm run unify:bullet2-verify-ci`** (runs **`unify:bullet1-guard`** then that installer: **`uk`** **`npm ci`** with retries, lint, **`next build`** for TypeScript + bundle, **`postbuild`** cleanup of CI-only **`tsconfig` includes** when Next injects them). For a **quick** Git audit + migration guard + **`supabase/SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql`** refresh without reinstalling **`uk/`**, use **`npm run unify:merge-preflight`**. **`.github/workflows/trainer-unify-guard.yml`** runs **`unify:bullet2-verify-ci`** after root **`npm ci`** (on **path-filtered pull requests** and on **every push** to **`main`** / **`skills-plan-unify`**). Aliases: **`npm run unify:bullet2-verify`**, **`npm run unify:bullet8-verify`**.
9. **Scheduled / extra CI:** **`unify-scheduled-verify.yml`** runs **`workflow_dispatch`**, weekly cron (Mondays 06:00 UTC), and **path-filtered** **`push`** to **`main`** / **`skills-plan-unify`** (same path list as PR CI). **`trainer-unify-guard.yml`** runs the **same** **`npm run unify:bullet2-verify-ci`** on **path-filtered PRs** and on **every push** to **`main`** / **`skills-plan-unify`** (no path filter on push), so the full gate still runs even when the scheduled workflow’s push filter does not match.

**Bullets 8-9 (one place):** [`docs/UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md).

When these are green, open the **`skills-plan-unify` → `main`** PR with a short description of scope, migrations, and any env vars required in production. Prefer the repo **pull request template** checklist (see **`.github/pull_request_template.md`**).

**Post-checklist SQL bundle (other Supabase projects):** paste or run **[`docs/SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql`](SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql)** after **`024_planner_unified_plan_sessions.sql`** (or equivalent planner DDL) is already applied.
