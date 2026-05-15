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
