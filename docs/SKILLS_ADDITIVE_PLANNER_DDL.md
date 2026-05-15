# Additive planner DDL on Skills Supabase (unify bullet 2)

This doc supports **additive-schema-live**: land planner tables and RLS on the **existing Skills (trainer) project** without renaming trainer drill **`public.sessions`**.

## Goal

- **One database** for trainer + planner.
- **Additive** changes: new columns on **`public.profiles`**, new **`plan_*`** tables, **`plan_sessions`** for the timetable, not a second `sessions` table for the planner.
- **Trainer keeps working**: run **`npm run unify:bullet1-guard`** before and after you apply migrations (see **`docs/UNIFY_BULLET1_TRAINER_GUARD.md`**).

## Preflight

1. **Branch or staging first** - Use Supabase [database branching](https://supabase.com/docs/guides/platform/branches) or a staging project; merge only after smoke tests.
2. **Backup** - Snapshot or point-in-time recovery aware before large DDL batches.
3. **Inventory** - In SQL: `\dt public.*` (or Table Editor) so you know current trainer tables.

## Canonical migration to apply

The intended **all-in-one** additive definition for the unified planner shape in this repo is:

| File | Role |
| --- | --- |
| **`supabase/migrations/024_planner_unified_plan_sessions.sql`** | Primary reference: **`planner_role`**, auth profiles sync trigger, **`plans`**, **`plan_sessions`**, related tables, RLS, RPCs as defined in that file. |
| **`supabase/migrations/025_mailchimp_webhook_config_enable_rls.sql`** | **Advisor / security:** enables RLS on **`mailchimp_webhook_config`** so secrets are not readable with the anon key (see **`docs/UNIFY_BULLET7_ADVISORS.md`**). Independent of planner shape; apply on every Skills env. |
| **`supabase/migrations/026_revoke_anon_execute_admin_and_internal_rpcs.sql`** | **Advisor 0028:** revoke **`anon`** (and **`public`**) `EXECUTE` on admin RPCs and internal triggers; keep **`student_invite_token_valid`** for anon. |
| **`supabase/migrations/027_planner_rls_bundle_05.sql`** | Tutor **`plan_members`** / **`student_invite_links`** policies + **`plan_sessions`** comment (idempotent). |
| **`supabase/migrations/028_planner_skill_repo_sync_marker.sql`** | No-op marker for remote history alignment. |
| **`supabase/migrations/029_fk_covering_indexes.sql`** | **Performance (0001):** FK covering indexes per Supabase advisor. |
| **`supabase/migrations/030_rls_auth_subquery_performance.sql`** | **Performance (0003):** `(select auth.uid())` / `(select auth.role())` in listed trainer tables’ RLS policies. |
| **`supabase/migrations/031_tutor_linked_writes_rls.sql`** | **Planner API alignment:** linked tutors (`plan_members.role = tutor`) may read/write student-keyed planner-linked rows where appropriate (see file for tables/policies). |
| **`docs/SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql`** | **After checklist green:** single paste-ready file = **`025`-`031`** concatenated (SQL Editor / DBA on envs that already have **`024`** or equivalent planner DDL). |

**Do not** apply **`024_planner_combined_execute.sql`** in addition to the unified file for the same environment unless you have verified they are intentionally split (they overlap heavily and can duplicate objects or fight over the same trigger).

Other files named **`024_*.sql`** in this folder (`024_exec_policies.sql`, `024_exec_schemas_tables_rls_rpc.sql`, …) may be **experimental fragments** or MCP payloads. Treat them as **non-canonical** until a maintainer marks them obsolete or folds them into a single numbered migration for production.

## Generated submit bundles

- **`npm run unify:submit-sql`** - runs **`scripts/concat-migrations.mjs`** and writes **`supabase/SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql`** (all non-underscore `supabase/migrations/*.sql`, sorted). For **existing** projects with migration history, treat this as **review / greenfield** only.
- **`docs/SUBMIT_UNIFY_INCREMENTAL_AFTER_BULLETS.sql`** - **`025`-`031`** for envs that already ran **`024`** (or equivalent planner batches). Regenerate by concatenating those files if you change them.

## Auth trigger caveat

`024_planner_unified_plan_sessions.sql` installs **`on_auth_user_created`** on **`auth.users`** to upsert **`public.profiles`** (including **`planner_role`** from metadata).

Earlier trainer history may have **dropped** a generic signup trigger (see **`006_drop_handle_new_user_trigger.sql`**). After unify DDL:

- **Password + OTP** users should still get a **`profiles`** row via this trigger **or** the app (`ensureProfileForUser` / trainer `upsertProfile`).
- **Retest** trainer registration and planner magic-link flows on staging before production.

## Files you should not paste into production blindly

Under **`supabase/migrations/`** you may see **scratch helpers** (payload JSON, partial SQL, `parts/` splits). Unless a maintainer has promoted them into a single reviewed migration:

- Do **not** run arbitrary **`_*.json`**, **`q*.sql`**, or **`policies_*.sql`** against production.
- Prefer **one** reviewed `.sql` migration per release train (or Supabase CLI **migrate** history).

## Remote verification (Skills project)

After you apply DDL (or to confirm an existing project), run in the SQL editor or via MCP:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'plans', 'plan_weeks', 'plan_days', 'plan_sessions',
    'session_completions', 'plan_members', 'student_invite_links',
    'extra_study_logs', 'mock_scores', 'weekly_reflections'
  )
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'planner_role';
```

You should see all planner tables and a **`planner_role`** column on **`public.profiles`**. Trainer drill **`public.sessions`** must still exist unchanged.

### Example: MCP-linked Skills project (this workspace)

On the Supabase project exposed as **`user-supabase-ucat`** in Cursor (verified 2026-05-15), those tables and **`planner_role`** are already present; applied migration names include **`planner_skill_q1_profiles_plans_through_plan_sessions`**, **`planner_skill_q2_tables_indexes_rls_rpc`**, and **`planner_skill_pol_policies_*`**. In that situation **bullet 2 is already live** on the database side. Keep the repo migration **`024_planner_unified_plan_sessions.sql`** as documentation and for other environments that have not yet applied the planner batches.

## After apply (smoke)

1. **`npm run unify:bullet2-verify`** at repo root (trainer guard + **`uk`** `tsc` + **`uk`** production build), or run the three steps manually (see **`docs/UNIFY_BULLET1_TRAINER_GUARD.md`** for bullet 1 only).
2. **Trainer**: guest drill, sign-in, dashboard, write a drill **`sessions`** row if possible.
3. **Planner**: OTP login, onboarding, **`plan_sessions`** reads, completion RPC/API.
4. **`supabase` advisors** and logs for new RLS errors.

## Related docs

- [`UNIFY_BULLET1_TRAINER_GUARD.md`](UNIFY_BULLET1_TRAINER_GUARD.md)
- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
- [`ACCESS_RLS_MATRIX.md`](ACCESS_RLS_MATRIX.md)
- [`SKILLS_PLAN_UNIFY_ENV.md`](SKILLS_PLAN_UNIFY_ENV.md)
