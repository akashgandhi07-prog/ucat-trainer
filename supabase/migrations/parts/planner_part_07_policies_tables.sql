-- Policies (explicit subqueries avoid recursion patterns)
drop policy if exists "plans: public read" on public.plans;
drop policy if exists "plans: student or tutor select" on public.plans;
create policy "plans: student or tutor select" on public.plans
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plans.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plans: student insert" on public.plans;
create policy "plans: student insert" on public.plans
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "plans: student_or_tutor_update" on public.plans;
create policy "plans: student_or_tutor_update" on public.plans
  for update
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plans.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plans.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: select" on public.plan_weeks;
create policy "plan_weeks: select" on public.plan_weeks
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: insert" on public.plan_weeks;
create policy "plan_weeks: insert" on public.plan_weeks
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: update" on public.plan_weeks;
create policy "plan_weeks: update" on public.plan_weeks
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: delete" on public.plan_weeks;
create policy "plan_weeks: delete" on public.plan_weeks
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: select" on public.plan_days;
create policy "plan_days: select" on public.plan_days
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: insert" on public.plan_days;
create policy "plan_days: insert" on public.plan_days
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: update" on public.plan_days;
create policy "plan_days: update" on public.plan_days
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: delete" on public.plan_days;
create policy "plan_days: delete" on public.plan_days
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: select" on public.plan_sessions;
create policy "plan_sessions: select" on public.plan_sessions
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: insert" on public.plan_sessions;
create policy "plan_sessions: insert" on public.plan_sessions
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: update" on public.plan_sessions;
create policy "plan_sessions: update" on public.plan_sessions
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: delete" on public.plan_sessions;
create policy "plan_sessions: delete" on public.plan_sessions
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "extra_study: select" on public.extra_study_logs;
create policy "extra_study: select" on public.extra_study_logs
  for select using (student_id = (select auth.uid()));

drop policy if exists "extra_study: insert" on public.extra_study_logs;
create policy "extra_study: insert" on public.extra_study_logs
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "extra_study: update" on public.extra_study_logs;
create policy "extra_study: update" on public.extra_study_logs
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "extra_study: delete" on public.extra_study_logs;
create policy "extra_study: delete" on public.extra_study_logs
  for delete using (student_id = (select auth.uid()));
