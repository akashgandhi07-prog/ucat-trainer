# Unify bullets 8-9: CI parity and scheduled verify

Supports **checklist items 8-9** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**.

**`scripts/uk-planner-install-verify.mjs`:** **`nukeNodeModulesDir()`** (rename-then-delete on Unix) plus **`rm -rf`/`rmSync`** fallbacks, **`npm ci`** several times with a **fresh temp npm cache** each time, **`sync` + short sleep** on Unix, **`clean()`** every attempt, **`repairDarwinSwcIfNeeded`** after postinstall, **`installOk`** (includes **`require.resolve`** for **`next/*`** + **`@supabase/ssr`**) + **`toolchainSmokeOk`** + **`eslintProjectBootOk`** (lint **`eslint.config.mjs`** so flat-config transitive deps are present), and on the **final** attempt falls back to **`npm install`** (still driven by **`uk/package-lock.json`**) when macOS **`ENOTEMPTY`** / tar races make **`npm ci`** unreliable locally. GitHub Actions Linux runners usually stay on **`npm ci`** only.

## Verify scripts (root `package.json`)

The **first group** in the table runs the **same** full gate unless you opt out with env vars. **`unify:merge-preflight`** is separate (see its row).

| Script | What it runs |
| --- | --- |
| **`npm run unify:bullet2-verify-ci`** | **`unify:bullet1-guard`**, then **`node scripts/uk-planner-install-verify.mjs`** (by default: **`clean()`** + **`npm ci`** in **`uk/`** with retries + temp npm cache, **`npm install`** on the final attempt if needed, **`postinstall`**, **`installOk`** + **`toolchainSmokeOk`** + **`eslintProjectBootOk`**, **`uk` lint**, **`npx tsc --noEmit`**, **`npm run build`** = **`node ./node_modules/next/dist/bin/next build`** with **`NEXT_CI_DIST_DIR` unset** (stable **`.next`**), **`postbuild`** + verify tail **`strip-next-ci-tsconfig.mjs`**). |
| **`npm run unify:bullet2-verify`** | **Alias** of **`unify:bullet2-verify-ci`** (same as CI). |
| **`npm run unify:bullet8-verify`** | Alias of **`unify:bullet2-verify-ci`**. |
| **`npm run unify:checklist-automated`** | Alias of **`unify:bullet2-verify-ci`**. |
| **`npm run unify:release-gate-automated`** | Alias of **`unify:bullet2-verify-ci`**. |
| **`npm run unify:merge-preflight`** | **Fast path:** **`unify:bullet1-audit`** + **`unify:check-migrations`** + **`unify:submit-sql`** only (no trainer build, no **`uk/`** reinstall). Use to refresh Git/migration/SQL evidence when the full gate is too heavy. |

Use **`unify:bullet2-verify-ci`** (or an alias in that first group) for **full** merge evidence before **`skills-plan-unify` → `main`**. **`unify:merge-preflight`** covers bullets **1** (Git audit), **2** (migration foot-gun scan), and **submit SQL** regeneration only; it does **not** replace trainer or **`uk`** builds. If **`npm ci`** in **`uk/`** fails with **ENOSPC**, free disk first. Optional: **`SKIP_UK_NPM_CI=1`** only when **`uk/node_modules`** is already complete (see **`scripts/uk-planner-install-verify.mjs`**).

## Hosted workflows

| Workflow | Trigger | Command |
| --- | --- | --- |
| [`.github/workflows/trainer-unify-guard.yml`](../.github/workflows/trainer-unify-guard.yml) | **Pull requests** touching listed paths · **Every push** to **`main`** / **`skills-plan-unify`** (no path filter on push) | Root **`npm ci`**, then **`npm run unify:bullet2-verify-ci`** |
| [`.github/workflows/unify-scheduled-verify.yml`](../.github/workflows/unify-scheduled-verify.yml) | Weekly Monday 06:00 UTC · **`workflow_dispatch`** · **Push** to **`main`** / **`skills-plan-unify`** **only** when changed paths match the PR path list | Same as above |

So **`trainer-unify-guard`** already re-runs the full gate on **any** commit to the integration branches; **`unify-scheduled-verify`** adds **schedule** / **manual** runs and **path-filtered pushes** (for example docs-only pushes that skip **`trainer-unify-guard`** on PRs still get a periodic full verify via cron).

Item **9** therefore covers **schedule**, **manual**, and **filtered pushes** in the second workflow; item **8** is satisfied whenever **`trainer-unify-guard`** (or either workflow) runs **`unify:bullet2-verify-ci`** successfully.

## GitHub Actions

Keep both workflows **enabled**. If **`unify-scheduled-verify`** is disabled, you still get the full gate on **every push** to **`main`** / **`skills-plan-unify`** via **`trainer-unify-guard`**; you only lose the **weekly** and **path-filtered push** coverage from the second workflow until you re-enable it or use **`workflow_dispatch`**.

## Related

- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
- [`UNIFY_BULLET1_TRAINER_GUARD.md`](UNIFY_BULLET1_TRAINER_GUARD.md)
- [`.github/pull_request_template.md`](../.github/pull_request_template.md)
