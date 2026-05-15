# Unify plan bullet 3: RLS verification (release gate)

Supports **checklist item 3** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**: tutor and student paths against **`docs/ACCESS_RLS_MATRIX.md`**.

## Automated snapshot (Supabase advisors, MCP-linked project)

**Recorded:** 2026-05-15 against the project exposed as **`user-supabase-ucat`** in Cursor.

### Critical (ERROR)

| Lint | Detail | Suggested handling |
| --- | --- | --- |
| **RLS disabled in public** | `public.mailchimp_webhook_config` had **RLS off** | **Resolved** by migration **`025_mailchimp_webhook_config_enable_rls.sql`** (see **`UNIFY_BULLET7_ADVISORS.md`**). Dashboard may still show **INFO** “RLS enabled no policy” — intentional deny for API roles. |

### Warnings (representative)

- **`pg_net` extension in `public`** — move extension out of `public` when convenient. [Lint 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- **SECURITY DEFINER RPCs** — migration **`026_revoke_anon_execute_admin_and_internal_rpcs.sql`** removed **`anon`** `EXECUTE` on admin stats RPCs, `consume_student_invite`, Mailchimp trigger helper, and auth profile sync (details in **`UNIFY_BULLET7_ADVISORS.md`**). Advisors may still list **0029** for `authenticated` (expected: bodies enforce admin / invite rules) and **0028** for **`student_invite_token_valid`** (required for unauthenticated `/join` links). [0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- **Auth: leaked password protection** disabled — enable in Supabase Auth settings if you use password sign-up. [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

Re-run advisors after any DDL batch: Supabase Dashboard **Advisors**, or MCP **`get_advisors`** (`type: "security"`).

## Table-level sanity (planner + trainer spine)

From **`list_tables`** on the same project: **`public.sessions`**, **`public.profiles`**, and planner tables **`plans`**, **`plan_sessions`**, etc. report **`rls_enabled: true`**.

**Migration `031_tutor_linked_writes_rls`:** extends policies on **`session_completions`**, **`mock_scores`**, **`weekly_reflections`**, and **`extra_study_logs`** so a linked tutor (`plan_members.role = tutor`) may read/write rows keyed by **`plans.student_id`** (still not arbitrary UUIDs). Re-run tutor manual checks after apply.

## Manual scenarios (you must still run)

Use **`ACCESS_RLS_MATRIX.md`** as the script. Minimum:

1. **Student:** OTP login → onboarding → active plan → mark a **`plan_session`** complete (UI or API) → read-back.
2. **Tutor:** login as tutor → open assigned student plan → attempt action allowed by matrix (read plan, invite flows).
3. **Tutor writes (post-`031`):** as linked tutor, add or edit **`session_completions`**, **`mock_scores`**, **`weekly_reflections`**, or **`extra_study_logs`** for that student’s plan where the product allows it; confirm saves succeed and appear for the student.
4. **Cross-account:** second browser / incognito user B must **not** read or mutate user A’s plan rows (UI + optional REST check).

**Evidence refresh (automated, not a substitute for rows 1–4):** `npm run unify:merge-preflight` + advisors via Dashboard or MCP **`get_advisors`**.

## Documenting exceptions

If a scenario fails but you ship anyway, add a dated subsection under **`ACCESS_RLS_MATRIX.md`** or here with: scenario, risk, owner, follow-up issue ID.
