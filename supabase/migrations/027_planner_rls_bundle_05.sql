-- Synced to Supabase via MCP migration name `repo_027_planner_rls_bundle_05_sync` (idempotent).
-- Tutor policies on plan_members + student_invite_links; plan_sessions table comment.

drop policy if exists "plan_members: update" on public.plan_members;
create policy "plan_members: update" on public.plan_members
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
    )
  );


drop policy if exists "plan_members: delete" on public.plan_members;
create policy "plan_members: delete" on public.plan_members
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
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
