# Access model and RLS expectations (unified trainer + planner)

This matrix is the checklist from the unify plan: who can reach which routes, what the UI should do, and what PostgreSQL must enforce. It assumes one Supabase project, `auth.users`, and `public.profiles` as the identity spine for new planner FKs. For advisor snapshots and manual RLS sign-off, see **[`UNIFY_BULLET3_RLS_VERIFICATION.md`](UNIFY_BULLET3_RLS_VERIFICATION.md)**.

## Legend

- **RLS**: Row Level Security on the named table(s); tests should include anon, student, tutor, and admin where applicable.
- **UI**: What the product shows when the mode matches; avoid silent empty dashboards.

## Route prefix × auth mode

| Route / area | Anonymous (guest) | Authenticated student (trainer only) | Student + active plan | Student onboarding incomplete | Tutor (`planner_role` tutor) | Trainer admin (`profiles.role` admin) |
| --- | --- | --- | --- | --- | --- | --- |
| Trainer marketing + public drills (e.g. `/ucat-*` when merged into Next) | Full read/drill per today’s trainer rules; no forced login | Same; optional sync to `profiles` on sign-in | Same + optional “Open study plan” CTA | Same; resume planner from CTA if desired | Same as student unless route is tutor-only | Admin tools gated separately (e.g. `/admin`) |
| Planner `/auth/*` | Login, callback, password reset | Same | Same | Same | Same | Same |
| Planner `/`, `/plan/[slug]` (shared links) | Read-only plan view if RLS allows; no write | Same | Same + edit if `plan_members` | Redirect or CTA to `/onboarding` for own account | Tutor views per membership | Unusual; treat as student unless admin override documented |
| Planner `/onboarding` | Redirect to login | Create plan flow | Usually redirect to `/dashboard` if active plan | Continue onboarding | Block or show error if tutor lands here by mistake | Same |
| Planner `/dashboard`, `/dashboard/plan` | Redirect to login | Redirect to onboarding if no plan; else full student UI | Full UI | Resume onboarding | N/A | N/A |
| Planner `/tutor/*` | Redirect to login | Forbidden or empty | Forbidden | Forbidden | List/inspect linked students per `plan_members` + RLS | Optional read-only oversight only if explicitly built |

## Table family × who should read/write (high level)

| Table / family | Anon | Student (owner) | Tutor (linked) | Service role / edge |
| --- | :---: | :---: | :---: | :---: |
| `profiles` | No direct writes | Own row read/update per policy | Limited read for students on linked plans | Provisioning, webhooks |
| Trainer `sessions` (drills) | Per existing trainer policy | Own rows | Usually no | Jobs |
| `plans`, `plan_weeks`, `plan_days`, `plan_sessions` | Select only where share slug + policy allows | Full CRUD on own plan | Read/update per tutor policy | Regenerate RPC if any |
| `session_completions` | No | Own student_id row | Insert/update/delete when linked tutor on same plan (see migration **031**) | Maintenance |
| `plan_members` | No | Own membership rows | Tutor/student roles per invite | Invites |
| `bug_reports`, `question_feedback`, `analytics_events` | Per trainer product rules | Own or anon as today | Same | N/A |

## Failure and edge cases (UI + ops)

| Situation | Expected UI / behaviour |
| --- | --- |
| JWT present but `auth.uid()` flaky / refresh loop | Refresh session once; toast “Session expired” then local sign-out path |
| Auth ok but no `profiles` row | Deterministic “Completing setup…” with single `upsert` retry; no `{}` shell |
| RLS `permission denied` | Toast + retry; log correlation id; do not show fake zeros |
| Plan inactive or half-generated | Actionable copy + link to regenerate endpoints |
| Invite token invalid/expired | Single clear error string; no generic 500 |
| Guest must not hit planner login | Middleware allowlist must not blanket-redirect public trainer URLs |

## Regression checklist (manual or automated)

1. Anonymous: open a public drill URL (`/ucat…` or `/ucat-…` on Next); no redirect to planner login.
2. Student: complete a drill session row in trainer `sessions`; planner unrelated.
3. Student with plan: toggle completion on a `plan_sessions` row; RLS allows owner; linked tutor can update when migration **031** policies are applied.
4. Tutor: open linked student plan; cannot open arbitrary student by id guessing (RLS denies).
5. Re-run Supabase advisors after DDL batches; triage output per **`docs/UNIFY_BULLET7_ADVISORS.md`** (bullet 7).

## Related implementation notes

- Maintainer merge flow and branch strategy: [`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md).
- Environment variables for trainer + `uk/`: [`docs/SKILLS_PLAN_UNIFY_ENV.md`](SKILLS_PLAN_UNIFY_ENV.md).
- Planner timetable table name on unified DB: `plan_sessions` (see `uk/src/lib/planner-db-tables.ts`).
- Planner app reads **`profiles.planner_role`** (`student` | `tutor` | null) for routing and API guards. OTP still sends `user_metadata.role`; the auth trigger maps that into `planner_role`. Do not use **`profiles.role`** (`user` | `admin`) for tutor checks.
- Next middleware must grow an explicit public-route allowlist before trainer routes are hosted in the same app (see unify plan Phase C).
