# Unify plan bullet 4: Planner smoke + API scoping (release gate)

Supports **checklist item 4** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**.

## Automated gate (CI surrogate)

From repo root:

```bash
npm run unify:bullet2-verify
```

Includes **`uk`** ESLint, **`scripts/regression-unify-matrix.mjs`** (`plan_sessions` isolation), **`tsc --noEmit`**, and **`next build`**.

## Manual smoke (deployed `uk/`)

Run on **staging** first, with production-like env (`NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY` for tutor invite if testing invites).

1. **OTP / magic link:** `/auth/login` → receive email → land on `/auth/callback` → redirected to `/dashboard`, `/onboarding`, or `/tutor` as appropriate.
2. **Onboarding:** new student completes flow; **`plans`** row created.
3. **Plan view:** `/dashboard/plan` (or timetable route) shows **`plan_sessions`**.
4. **Completion:** complete a slot; confirm **`session_completions`** (or your RPC path) updates.
5. **Tutor invite:** tutor flow creates invite; student accepts **`/join/[token]`** if applicable.

## IDOR spot-check (static review; code in repo)

### `uk/src/app/api/**` (mutations touching a plan)

| Route | Guard pattern |
| --- | --- |
| `sessions/complete`, `extra-study`, `reflections`, `plans/regenerate`, `plans/rebalance`, `plans/update-exam`, `mock-scores` POST | **`requireStudentOrTutorPlan`** (plan owner or **`plan_members`** tutor; rows keyed by **`plans.student_id`**) |
| `plans/mock-target` PATCH, `days/update` POST | **`requireStudentOrTutorPlan`** (owner or **`plan_members`** tutor) |
| `plans/create` POST | New plan is owned by **`auth` user**; optional **`inviteToken`** via RPC (see route) |
| `tutor/invite` POST | **`planner_role === tutor`**; no arbitrary **`planId`** in body—links by student email / existing plan |
| `tutor/invite-link` POST | **`planner_role === tutor`**; generic invite token (no **`planId`**) |

### Server UI (not under `api/`)

| Location | Guard pattern |
| --- | --- |
| `tutor/student/[planId]` (RSC) | **`hasTutorPlanMembership`** before loading plan rows |

**Manual proof remains required:** call student-only APIs as an authenticated **non-owner** with a guessed UUID **`planId`** and expect **403/404**, not **200**. Tutor flows: a user in **`plan_members`** as tutor should receive **200** on the routes above for linked plans; tutors **not** on the plan should still get **403/404**.

## Related

- [`ACCESS_RLS_MATRIX.md`](ACCESS_RLS_MATRIX.md)
- [`UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md)
