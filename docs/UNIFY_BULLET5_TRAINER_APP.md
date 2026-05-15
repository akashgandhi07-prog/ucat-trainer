# Unify plan bullet 5: Vite trainer merge readiness

This document closes **checklist item 5** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**: the trainer stays production-safe on **one Supabase project** with the planner (preferred), or on a **documented temporary split** if you are still straddling two projects.

## Intent

1. **Production build** for the Vite app is green (lint + `tsc -b` + `vite build`).
2. **Guest drills** still record to **localStorage** and the **dashboard** still reflects guest history without signing in.
3. **Signed-in** flows still read/write **`public.sessions`** (drill telemetry) and **`public.profiles`** as before against the configured project.
4. **Env** matches the rollout story: either unified URL/keys for trainer + planner, or an explicit dual-project arrangement documented in **`docs/SKILLS_PLAN_UNIFY_ENV.md`**.

## Automated gate (CI surrogate)

From the **repo root**:

```bash
npm run unify:bullet5-verify
```

This is the same automation as bullet 1: migration foot-gun scan + trainer lint + production build. It does **not** open a browser.

For the full trainer **and** planner compile gate, use **`npm run unify:bullet2-verify-ci`** (same as **`npm run unify:bullet2-verify`**).

## Manual smoke (required before ticking release item 5)

Run against the **same branch and env** you intend to ship. Use **staging** first when changing Supabase.

### Environment

- Confirm **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** point at the intended project (unified Skills, or your documented trainer-only project if still on dual-env).

### Guest (no account)

1. Open **`/`** (landing).
2. Complete at least one short **guest** drill (for example Speed Reading **`/ucat-verbal-reasoning-speed-reading-trainer`**, Rapid Recall **`/ucat-rapid-recall-trainer`**, or another route that appends to guest sessions).
3. Open **`/dashboard`** while still signed out: counts and summaries should include the guest sessions you just created (stored under the **`guest_sessions`** localStorage key).

### Authenticated

1. Sign in with a test user.
2. **`/dashboard`** should load without errors.
3. Run a drill that persists to Supabase and confirm a new row in **`public.sessions`** (or use the UI/history you already trust).
4. If the user had **guest** history before sign-in, confirm the app still behaves as designed (for example toast on sync failure should not block sign-in; guest data may upload per **`AuthContext`**).

### Unified product link

- If **`VITE_PLANNER_URL`** is set, the header **Study plan** link should open the deployed **`uk`** app. Omit the variable to hide the link.

### After planner DDL (bullet 2)

Trainer must **not** require planner tables for core drills. If anything fails only after additive DDL, treat it as a regression: check RLS and policies on **`public.sessions`** / **`public.profiles`** (see **`docs/ACCESS_RLS_MATRIX.md`**).

## CI

**`.github/workflows/trainer-unify-guard.yml`** runs **`npm run unify:bullet1-guard`**, which satisfies the **automated** half of this bullet on each qualifying PR and on pushes to **`main`** / **`skills-plan-unify`**.

## Related docs

- [`UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md) (evidence pack for checklist items 1–6)
- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md) (full merge checklist)
- [`UNIFY_BULLET1_TRAINER_GUARD.md`](UNIFY_BULLET1_TRAINER_GUARD.md) (migration + compile guard)
- [`UNIFY_BULLET6_OPS_CUTOVER.md`](UNIFY_BULLET6_OPS_CUTOVER.md) (bullet 6: hosting, auth URLs, rollback)
- [`SKILLS_PLAN_UNIFY_ENV.md`](SKILLS_PLAN_UNIFY_ENV.md) (unified vs dual Supabase)
- [`SKILLS_ADDITIVE_PLANNER_DDL.md`](SKILLS_ADDITIVE_PLANNER_DDL.md) (bullet 2 DDL)
