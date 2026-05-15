drop policy if exists "completions: select" on public.session_completions;
create policy "completions: select" on public.session_completions
  for select using (student_id = (select auth.uid()));

drop policy if exists "completions: insert" on public.session_completions;
create policy "completions: insert" on public.session_completions
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "completions: update" on public.session_completions;
create policy "completions: update" on public.session_completions
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "completions: delete" on public.session_completions;
create policy "completions: delete" on public.session_completions
  for delete using (student_id = (select auth.uid()));

drop policy if exists "mock_scores: select" on public.mock_scores;
create policy "mock_scores: select" on public.mock_scores
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = mock_scores.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "mock_scores: insert" on public.mock_scores;
create policy "mock_scores: insert" on public.mock_scores
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "mock_scores: update" on public.mock_scores;
create policy "mock_scores: update" on public.mock_scores
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "mock_scores: delete" on public.mock_scores;
create policy "mock_scores: delete" on public.mock_scores
  for delete using (student_id = (select auth.uid()));

drop policy if exists "reflections: select" on public.weekly_reflections;
create policy "reflections: select" on public.weekly_reflections
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = weekly_reflections.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "reflections: insert" on public.weekly_reflections;
create policy "reflections: insert" on public.weekly_reflections
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "reflections: update" on public.weekly_reflections;
create policy "reflections: update" on public.weekly_reflections
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "reflections: delete" on public.weekly_reflections;
create policy "reflections: delete" on public.weekly_reflections
  for delete using (student_id = (select auth.uid()));

-- plan_members: non-recursive (join plans)
drop policy if exists "plan_members: select" on public.plan_members;
create policy "plan_members: select" on public.plan_members
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.tutor_id = (select auth.uid())
          or p.student_id = (select auth.uid())
        )
    )
  );

drop policy if exists "plan_members: insert" on public.plan_members;
create policy "plan_members: insert" on public.plan_members
  for insert with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );

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
