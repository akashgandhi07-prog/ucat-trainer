# Unify release gate status (checklist items 1–9)

**Last automated pass:** **2026-05-15 (execute plan):** Monorepo commit `824ae0e` on `skills-plan-unify`: `uk/` absorbed (97 files), trainer hub (`UnifiedProductHub`, header Mock scores link), `npm run unify:bullet2-verify-ci` green. Linked Supabase verified via MCP (schema through `031`, no DDL replay). **Still manual:** staging/prod deploy, `VITE_PLANNER_URL` / planner env, Auth redirect URLs, single-login browser test.

**Prior automated pass:** **2026-05-15:** **`npm run unify:bullet2-verify-ci`** green (**`unify:bullet1-guard`** + **`scripts/uk-planner-install-verify.mjs`**: clean **`uk/`** **`npm ci`** with retries until **`installOk`** (**`require.resolve`** for **`next/*`** + **`@supabase/ssr`**) + **`eslintProjectBootOk`** + **`toolchainSmokeOk`**, **`npm run lint`**, **`npx tsc --noEmit`**, **`npm run build`** = **`node ./node_modules/next/dist/bin/next build`** with **`NEXT_CI_DIST_DIR` cleared** for the verify process (stable **`.next`**, avoids **`.next-ci-*`** trace **`ENOENT`**), **`postbuild`** + verify tail **`strip-next-ci-tsconfig.mjs`**, **`.next` + `next.lock` pre-clean** in **`uk` `build`** script). **`uk/next.config.ts`**: **`outputFileTracingRoot`** at monorepo parent only. **`npm run unify:merge-preflight`** ( **`unify:bullet1-audit`** + **`unify:check-migrations`** + **`unify:submit-sql`** → 32 top-level migrations). **MCP `user-supabase-ucat`:** **`list_migrations`** includes **`tutor_linked_writes_rls_031`** (no **`apply_migration`** replay on linked project); **`get_advisors`** re-fetched (**security** 12 lints, **performance** 20 × `unused_index`) — triage in **`UNIFY_BULLET7_ADVISORS.md`**.

**Checklist state:** In this workspace, **2**, **7** (MCP-linked project), **8**, and **9** are supported by automation + docs + linked Supabase evidence. **1**, **3**, **4**, **5**, and **6** still need your GitHub org, deployed hosts, and manual browser / dashboard steps (see summary table below)—they cannot be closed by an agent alone.

This file records what was **verified in-repo or via linked Supabase MCP** versus what still needs **your organisation** (GitHub org, hosting dashboards, manual browser QA).

**Submit SQL (after checklist is green on each target database):**

- **Incremental (usual catch-up):** [`docs/SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql`](SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql) concatenates repo **`025`–`031`**; apply only after **`024_planner_unified_plan_sessions.sql`** (or your reviewed planner batches) is already on that project.
- **Full sorted concat (greenfield / review only):** `npm run unify:submit-sql` writes **`supabase/SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql`** (every non-underscore `supabase/migrations/*.sql` in sorted order). Do not replay blindly on production when migration history already exists.

**Linked Supabase MCP:** remote history includes **`fk_covering_indexes_029`** and **`rls_auth_subquery_performance_030`** alongside earlier **`planner_skill_*`** batches; incremental submit SQL is safe to use on **other** envs that mirror **`024`**+. A no-op **`planner_skill_unify_submit_sql_bundle_recorded`** row may appear on the linked project (marker only); it is **not** required in Git for new environments.

**Local verify gotchas:** **`npm ci`** can fail with **`ENOSPC`** if disk or the npm temp cache volume is full; **`npm`** can also exit **0** with **`TAR_ENTRY_ERROR`** warnings and leave **`node_modules`** incomplete—the installer retries until **`installOk`**, **`eslintProjectBootOk`**, and **`toolchainSmokeOk`** pass. **`next build`** can refuse to start if another **`next`** process holds the build lock: stop it and **`rm -rf uk/.next`**.

---

## Summary

| Item | Automated / remote checks done here | Still required from you |
| --- | --- | --- |
| **1. Git** | Run **`npm run unify:bullet1-audit`** (remotes, **`git fetch origin`**, optional **`git fetch upstream`**, local/remote **`skills-plan-unify`** hints, **`origin`/`upstream` → skills-trainer** URL check). | Follow **`docs/UNIFY_BULLET1_GIT.md`**: point `origin` (or **`upstream`**) at **TheUKCATPeople/skills-trainer**, create/use **`skills-plan-unify`**, merge intended work there before **`main`**. |
| **2. Database** | **MCP project `user-supabase-ucat`:** planner tables present; remote includes **`tutor_linked_writes_rls_031`** (tutor-aligned RLS for completions, mocks, reflections, extra study). **`025`-`030`** equivalents already applied under `planner_skill_*` / `repo_*` names where applicable. | Apply **`031_tutor_linked_writes_rls.sql`** on **other** envs that have planner tables but not yet this batch; then **`docs/SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql`** (now **025-031**) or sorted **`npm run unify:submit-sql`** output for review. |
| **3. RLS** | Supabase **security advisors** pulled (see **`UNIFY_BULLET3_RLS_VERIFICATION.md`**). Planner-related tables show **RLS enabled** in table list. | **Manual** tutor/student UI journeys on staging; accept or fix advisor items; document any accepted risk (matrix exceptions). |
| **4. Planner** | **`uk`** tutor-aligned **`requireStudentOrTutorPlan`** on plan mutations (see **`UNIFY_BULLET4_PLANNER_SMOKE.md`**); **`requireStudentOrTutorPlan`** now returns **`studentId`** for tutor writes to **`session_completions`**, **`mock_scores`**, **`weekly_reflections`**, **`extra_study_logs`**. Public **`/ucat*`** shell + matrix script. | **Manual** OTP, onboarding, plan view, completion, tutor invite on deployed **`uk`**; tutor-as-actor smoke on linked student plans. |
| **5. Trainer** | Same compile gate as above; guest flow is **localStorage**-based (no server needed for guest smoke). | **Manual** browser: guest drill → **`/dashboard`** → sign-in → confirm **`sessions`** in Supabase; optional **`VITE_PLANNER_URL`** with real planner host. |
| **6. Ops** | Runbook exists: **`UNIFY_BULLET6_OPS_CUTOVER.md`**. | Configure **Supabase Authentication → URL** list, CDN/host **redirects**, staging/prod **env parity**, and fill **rollback owners** in that doc. |
| **7. Advisors** | **`025`** + **`026`** + **`031`** in repo; **`025`**/**`026`**/**`031`** applied to **MCP-linked** project (`mailchimp` RLS + **`anon`** `EXECUTE` tightened on admin/internal RPCs + tutor-linked table policies). Latest **`get_advisors`** snapshot (counts) in **`UNIFY_BULLET7_ADVISORS.md`**. | Re-run **Advisors** on **each** env; apply **`025`**/**`026`**/**`031`** where missing; **`pg_net`** + auth password WARNs per triage doc. |
| **8. CI reproducibility** | **`npm run unify:merge-preflight`** + **`npm run unify:bullet2-verify-ci`** green: **`uk-planner-install-verify`** (**`nukeNodeModulesDir`**, per-attempt temp **`npm` cache**, **`npm ci`** / last **`npm install`**, **`installOk`** + **`toolchainSmokeOk`** + **`eslintProjectBootOk`**, **`npm run lint`**, **`npx tsc --noEmit`**, **`npm run build`** with **`NEXT_CI_DIST_DIR` unset**, **`postbuild`** + verify **`strip-next-ci-tsconfig.mjs`**). Workflows **`trainer-unify-guard.yml`** / **`unify-scheduled-verify.yml`** run **`unify:bullet2-verify-ci`** after root **`npm ci`**. | Keep disk headroom for **`npm ci`**; stop stray **`next dev`** / **`next build`** if lock errors appear. |
| **9. Scheduled regression** | **`unify-scheduled-verify.yml`**: weekly Monday 06:00 UTC, **`workflow_dispatch`**, and **path-filtered** pushes to **`main`** / **`skills-plan-unify`**. **`trainer-unify-guard.yml`** also runs the **same** verify command on **every** push to those branches (no path filter on push). | Confirm Actions are enabled; watch first run after merge. |

---

## Commands run (reproducible)

From repo root:

```bash
npm run unify:merge-preflight
npm run unify:manual-bullets   # lists org-only bullets 1 + 3–6 and doc links
# Full gate (trainer + clean uk install + next build):
npm run unify:bullet2-verify-ci
```

**`npm run unify:merge-preflight`** runs **`unify:bullet1-audit`**, **`unify:check-migrations`**, and **`unify:submit-sql`** only (no **`uk/`** reinstall). Use it to refresh the evidence pack when disk or time makes the full gate heavy.

---

## Related runbooks

- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md) full merge checklist including items **7**–**9** (advisors, CI reproducibility, scheduled verify).
- [`UNIFY_BULLET1_GIT.md`](UNIFY_BULLET1_GIT.md)
- [`UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md)
- [`UNIFY_BULLET3_RLS_VERIFICATION.md`](UNIFY_BULLET3_RLS_VERIFICATION.md)
- [`UNIFY_BULLET4_PLANNER_SMOKE.md`](UNIFY_BULLET4_PLANNER_SMOKE.md)
- [`UNIFY_BULLET5_TRAINER_APP.md`](UNIFY_BULLET5_TRAINER_APP.md)
- [`UNIFY_BULLET6_OPS_CUTOVER.md`](UNIFY_BULLET6_OPS_CUTOVER.md)
- [`UNIFY_BULLET7_ADVISORS.md`](UNIFY_BULLET7_ADVISORS.md)
- [`UNIFY_MAINTENANCE_BACKLOG.md`](UNIFY_MAINTENANCE_BACKLOG.md)
- [`SKILLS_ADDITIVE_PLANNER_DDL.md`](SKILLS_ADDITIVE_PLANNER_DDL.md)

---

## Honest scope note

No agent can **complete** items 1 or 6 on your behalf without access to your GitHub organisation, DNS, and Supabase project settings. Item **7:** apply migrations **`025`** / **`026`** / **`031`** (as needed) on every Supabase project you ship; optional debt is listed in **`UNIFY_MAINTENANCE_BACKLOG.md`**. Items **8**–**9** are automation and process: merge the workflows and keep **`npm run unify:bullet2-verify-ci`** green. The linked **MCP** database already records **`031`**-equivalent migrations under project-specific names—**do not** replay **`SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql`** there; add **`032_*.sql`** (or later) in Git when you need a new **`apply_migration`**. This document is the **evidence pack** for everything that **was** completed from the workspace and linked MCP project.
