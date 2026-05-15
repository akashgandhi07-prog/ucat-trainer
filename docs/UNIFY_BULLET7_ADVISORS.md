# Unify plan bullet 7: Supabase advisors triage (release gate)

Supports **checklist item 7** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**: Mailchimp and other **Dashboard → Advisors** (or MCP **`get_advisors`**) items are triaged-fixed, accepted with owner, or scheduled.

## How to re-check

- **Dashboard:** Supabase project → **Advisors** (Security + Performance).
- **CLI / automation:** From Cursor, MCP server **`user-supabase-ucat`** → **`get_advisors`** with `type: "security"` or `"performance"`.
- **After DDL:** Re-run advisors before calling the release gate green.

## Triage log (maintainer updates)

| Lint / issue | Severity | Decision | Owner / date |
| --- | --- | --- | --- |
| `public.mailchimp_webhook_config` RLS disabled | ERROR (was) | **Fixed:** `025_mailchimp_webhook_config_enable_rls.sql` - RLS on, **no** policies for API roles (PostgREST cannot read secrets). Trigger `trigger_mailchimp_on_signup` still reads rows (table owner bypasses RLS). **MCP-linked project:** migration applied 2026-05-15. Other envs: apply same migration. | Done / apply per env |
| `public.mailchimp_webhook_config` RLS on, no policies | INFO | **Accepted intentional:** “no policies” = deny `anon`/`authenticated` table access via API; privileged SQL / owner paths only. [Lint 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) | |
| `pg_net` in `public` schema | WARN | **Defer** or move extension to another schema when convenient. [Lint 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) | |
| SECURITY DEFINER RPCs (`get_admin_*`, `get_analytics_summary`, `consume_student_invite`, …) | WARN | **Partial fix (026):** `026_revoke_anon_execute_admin_and_internal_rpcs.sql` revokes **`anon`** / **`public`** `EXECUTE` on admin stats RPCs, `consume_student_invite`, `trigger_mailchimp_on_signup`, and `handle_auth_user_profiles_planner_sync`; re-grants **`authenticated`** where needed and **`student_invite_token_valid` → anon** for `/join`. **MCP-linked project:** applied. Remaining advisor **0029** on those RPCs is *expected* (any signed-in user may call; function body enforces admin or invite rules). [0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) · [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) | |
| `student_invite_token_valid` + `anon` | WARN (0028) | **Accepted:** invite links must work **before** sign-in on `/join/[token]`. | |
| Auth leaked-password protection off | WARN | **Recommend:** enable in Auth settings if you allow password sign-up. [Docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) | |

Add rows for any new advisor output after migrations or major RLS changes.

## Latest MCP snapshot (Skills project, 2026-05-15, re-pull)

- **Security (`get_advisors` / `type: "security"`):** **12** lints - **1** INFO (**0008** `mailchimp_webhook_config` RLS on, no policies - intentional), **10** WARN (**0014** `pg_net` in `public`; **0028**/**0029** on `student_invite_token_valid`, `consume_student_invite`, `get_admin_*`, `get_analytics_summary`; **auth** leaked-password protection off). No ERROR-level database lints beyond the already-fixed Mailchimp “RLS disabled” case.
- **Performance (`get_advisors` / `type: "performance"`):** **20** × **`unused_index`** INFO (planner timetable + tutor-linked tables + FK-covering indexes from **`029`**, plus e.g. `question_feedback_question_idx` from **`021`**). **Accepted for unify:** low traffic / fresh indexes until production load; revisit with `pg_stat_user_indexes` before dropping any.

## Mailchimp config updates after RLS

Operational updates to **`edge_function_url`** / **`webhook_secret`** are still done with a **privileged** session (SQL Editor as postgres / service role), not the browser anon key-same as before **`docs/MAILCHIMP_SETUP.md`**.

## Optional next hardening (not required for bullet 7 “triage”)

**026 shipped:** `anon` can no longer call admin dashboard RPCs or internal Mailchimp / auth-sync helpers (see **`supabase/migrations/026_revoke_anon_execute_admin_and_internal_rpcs.sql`**). Remaining **0029** lints on `get_admin_*` / `consume_student_invite` are informational unless you move those calls server-side with the **service role** (large product change).

Further **0028** on **`student_invite_token_valid`** would require refactoring **`/join/[token]`** to a server route that validates tokens with **service_role** instead of the browser anon client-only do that if you accept the operational complexity.

## Related

- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
- [`UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md) (checklist items **8-9**: CI + schedule)
- [`UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md)
- [`UNIFY_BULLET3_RLS_VERIFICATION.md`](UNIFY_BULLET3_RLS_VERIFICATION.md)
- [`UNIFY_MAINTENANCE_BACKLOG.md`](UNIFY_MAINTENANCE_BACKLOG.md) (optional follow-ups: audit, `pg_net`, auth)
- [`MAILCHIMP_SETUP.md`](MAILCHIMP_SETUP.md)
