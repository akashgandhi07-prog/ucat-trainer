-- Run ONLY after playbook checklist (bullets 1-9) is green on the target environment.
-- If planner DDL is not yet present, apply supabase/migrations/024_planner_unified_plan_sessions.sql first (or your reviewed planner batch), then this bundle.
-- Source: repo files 025-031 concatenated 2026-05-15.

-- ========== 025_mailchimp_webhook_config_enable_rls.sql ==========
-- Bullet 7 / advisor: public.mailchimp_webhook_config had RLS disabled (secrets readable via anon key).
-- Rows are only consumed inside SECURITY DEFINER public.trigger_mailchimp_on_signup(); the table owner
-- bypasses RLS, so the auth trigger keeps working. No client policies: anon/authenticated cannot SELECT.

alter table public.mailchimp_webhook_config enable row level security;

comment on table public.mailchimp_webhook_config is
  'Config for Mailchimp signup webhook: edge_function_url and webhook_secret. RLS on; no policies for API roles - reads only from trigger (definer/owner).';

-- ========== 026_revoke_anon_execute_admin_and_internal_rpcs.sql ==========
-- Advisor 0028: anon could EXECUTE SECURITY DEFINER RPCs exposed via PostgREST.
-- Admin RPCs already enforce profiles.role = 'admin' but should not be callable without a session.
-- student_invite_token_valid(text) stays callable for anon (unauthenticated /join/[token] page).
-- consume_student_invite: authenticated only (invite consumption after login / API with session).
-- trigger_mailchimp_on_signup: no API EXECUTE (auth trigger runs as function owner).
-- handle_auth_user_profiles_planner_sync: service_role only (same as 024_planner_unified_plan_sessions).

-- Admin dashboard RPCs: authenticated only
revoke execute on function public.get_admin_stats() from public, anon;
revoke execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) from public, anon;

revoke execute on function public.get_admin_registrations_overview(integer) from public, anon;

revoke execute on function public.consume_student_invite(text) from public, anon;

revoke execute on function public.trigger_mailchimp_on_signup() from public, anon, authenticated;

revoke execute on function public.handle_auth_user_profiles_planner_sync() from public, anon, authenticated;

grant execute on function public.get_admin_stats() to authenticated;
grant execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) to authenticated;
grant execute on function public.get_admin_registrations_overview(integer) to authenticated;
grant execute on function public.consume_student_invite(text) to authenticated;

grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;

-- ========== 027_planner_rls_bundle_05.sql ==========
-- Synced to Supabase via MCP migration name `repo_027_planner_rls_bundle_05_sync` (idempotent).
-- Tutor policies on plan_members + student_invite_links; plan_sessions table comment.

drop policy if exists "plan_members: update" on public.plan_members;
create policy "plan_members: update" on public.plan_members
  for update
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );


drop policy if exists "plan_members: delete" on public.plan_members;
create policy "plan_members: delete" on public.plan_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );


drop policy if exists "student_invite_links: tutor read own" on public.student_invite_links;
create policy "student_invite_links: tutor read own" on public.student_invite_links
  for select using (tutor_id = (select auth.uid()));


drop policy if exists "student_invite_links: tutor insert own" on public.student_invite_links;
create policy "student_invite_links: tutor insert own" on public.student_invite_links
  for insert with check (tutor_id = (select auth.uid()));

comment on table public.plan_sessions is
  'UCAT revision timetable slots (distinct from trainer drill public.sessions)';

-- ========== 028_planner_skill_repo_sync_marker.sql ==========
-- Remote alignment marker (applied as `planner_skill_repo_sync_marker_028`).
-- Planner DDL already present via `planner_skill_q1` … `planner_skill_rls_bundle_05`.
select 1;

-- ========== 029_fk_covering_indexes.sql ==========
-- Performance (Supabase advisor 0001): covering indexes for FK columns without an index.

create index if not exists bug_reports_user_id_fkey_cover_idx on public.bug_reports (user_id);
create index if not exists extra_study_logs_student_id_fkey_cover_idx on public.extra_study_logs (student_id);
create index if not exists mock_scores_student_id_fkey_cover_idx on public.mock_scores (student_id);
create index if not exists plan_days_plan_week_id_fkey_cover_idx on public.plan_days (plan_week_id);
create index if not exists question_feedback_user_id_fkey_cover_idx on public.question_feedback (user_id);
create index if not exists student_invite_links_redeemed_by_student_id_fkey_cover_idx
  on public.student_invite_links (redeemed_by_student_id);
create index if not exists weekly_reflections_student_id_fkey_cover_idx on public.weekly_reflections (student_id);

-- ========== 030_rls_auth_subquery_performance.sql ==========
-- Performance (Supabase advisor 0003): wrap auth.* in subqueries so RLS initplan is stable.

alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can insert own profile" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can view own sessions" on public.sessions
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own sessions" on public.sessions
  with check ((select auth.uid()) = user_id);

alter policy "Users can view their own syllogism sessions" on public.syllogism_sessions
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own syllogism sessions" on public.syllogism_sessions
  with check ((select auth.uid()) = user_id);

alter policy "Users can insert bug reports" on public.bug_reports
  with check ((select auth.uid()) = user_id);

alter policy "Admins can view bug reports" on public.bug_reports
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Admins can update bug reports" on public.bug_reports
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Admins can view analytics events" on public.analytics_events
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Anyone can insert analytics events" on public.analytics_events
  with check (
    (((select auth.role()) = 'authenticated'::text) and ((user_id is null) or (user_id = (select auth.uid()))))
    or (((select auth.role()) = 'anon'::text) and (user_id is null))
  );

alter policy "Admins can view question feedback" on public.question_feedback
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Users can insert question feedback" on public.question_feedback
  with check ((user_id is null) or (user_id = (select auth.uid())));

-- ========== 031_tutor_linked_writes_rls.sql ==========
-- Align RLS with planner API: linked tutors (plan_members.role = tutor) may read/write
-- student-keyed rows for that plan when student_id matches plans.student_id.

-- ----- session_completions -----
drop policy if exists "completions: select" on public.session_completions;
create policy "completions: select" on public.session_completions
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.plan_sessions ps
      join public.plan_members pm on pm.plan_id = ps.plan_id
      where ps.id = session_completions.session_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "completions: insert" on public.session_completions;
create policy "completions: insert" on public.session_completions
  for insert with check (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "completions: update" on public.session_completions;
create policy "completions: update" on public.session_completions
  for update
  using (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "completions: delete" on public.session_completions;
create policy "completions: delete" on public.session_completions
  for delete using (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- mock_scores -----
drop policy if exists "mock_scores: insert" on public.mock_scores;
create policy "mock_scores: insert" on public.mock_scores
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "mock_scores: update" on public.mock_scores;
create policy "mock_scores: update" on public.mock_scores
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "mock_scores: delete" on public.mock_scores;
create policy "mock_scores: delete" on public.mock_scores
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- weekly_reflections -----
drop policy if exists "reflections: insert" on public.weekly_reflections;
create policy "reflections: insert" on public.weekly_reflections
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "reflections: update" on public.weekly_reflections;
create policy "reflections: update" on public.weekly_reflections
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "reflections: delete" on public.weekly_reflections;
create policy "reflections: delete" on public.weekly_reflections
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- extra_study_logs -----
drop policy if exists "extra_study: select" on public.extra_study_logs;
create policy "extra_study: select" on public.extra_study_logs
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = extra_study_logs.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "extra_study: insert" on public.extra_study_logs;
create policy "extra_study: insert" on public.extra_study_logs
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "extra_study: update" on public.extra_study_logs;
create policy "extra_study: update" on public.extra_study_logs
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "extra_study: delete" on public.extra_study_logs;
create policy "extra_study: delete" on public.extra_study_logs
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

