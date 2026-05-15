-- Harden RLS policies/functions and add FK indexes.
-- Applied to project: qvsekmmufqwqixdrudys

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.users (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "users: read own" on public.users;
drop policy if exists "users: insert own" on public.users;
drop policy if exists "users: update own" on public.users;
drop policy if exists "plans: public read" on public.plans;
drop policy if exists "plans: student insert" on public.plans;
drop policy if exists "plans: student or tutor update" on public.plans;
drop policy if exists "plan_weeks: read" on public.plan_weeks;
drop policy if exists "plan_weeks: write" on public.plan_weeks;
drop policy if exists "plan_days: read" on public.plan_days;
drop policy if exists "plan_days: write" on public.plan_days;
drop policy if exists "sessions: read" on public.sessions;
drop policy if exists "sessions: write" on public.sessions;
drop policy if exists "completions: student read" on public.session_completions;
drop policy if exists "completions: student write" on public.session_completions;
drop policy if exists "mock_scores: student write" on public.mock_scores;
drop policy if exists "mock_scores: tutor read" on public.mock_scores;
drop policy if exists "reflections: student write" on public.weekly_reflections;
drop policy if exists "reflections: tutor read" on public.weekly_reflections;
drop policy if exists "plan_members: read" on public.plan_members;
drop policy if exists "plan_members: write" on public.plan_members;

create policy "users: read own" on public.users
for select
using (id = (select auth.uid()));

create policy "users: insert own" on public.users
for insert
with check (id = (select auth.uid()));

create policy "users: update own" on public.users
for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "plans: public read" on public.plans
for select
using (true);

create policy "plans: student insert" on public.plans
for insert
with check (student_id = (select auth.uid()));

create policy "plans: student_or_tutor_update" on public.plans
for update
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.plan_members pm
    where pm.plan_id = plans.id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
)
with check (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.plan_members pm
    where pm.plan_id = plans.id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_weeks: select" on public.plan_weeks
for select
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_weeks.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_weeks.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_weeks: insert" on public.plan_weeks
for insert
with check (
  exists (
    select 1 from public.plans p
    where p.id = plan_weeks.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_weeks.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_weeks: update" on public.plan_weeks
for update
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_weeks.plan_id
      and p.student_id = (select auth.uid())
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
    where p.id = plan_weeks.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_weeks.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_weeks: delete" on public.plan_weeks
for delete
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_weeks.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_weeks.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_days: select" on public.plan_days
for select
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_days.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_days.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_days: insert" on public.plan_days
for insert
with check (
  exists (
    select 1 from public.plans p
    where p.id = plan_days.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_days.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_days: update" on public.plan_days
for update
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_days.plan_id
      and p.student_id = (select auth.uid())
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
    where p.id = plan_days.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_days.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_days: delete" on public.plan_days
for delete
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_days.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_days.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "sessions: select" on public.sessions
for select
using (
  exists (
    select 1 from public.plans p
    where p.id = sessions.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = sessions.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "sessions: insert" on public.sessions
for insert
with check (
  exists (
    select 1 from public.plans p
    where p.id = sessions.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = sessions.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "sessions: update" on public.sessions
for update
using (
  exists (
    select 1 from public.plans p
    where p.id = sessions.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = sessions.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
)
with check (
  exists (
    select 1 from public.plans p
    where p.id = sessions.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = sessions.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "sessions: delete" on public.sessions
for delete
using (
  exists (
    select 1 from public.plans p
    where p.id = sessions.plan_id
      and p.student_id = (select auth.uid())
  )
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = sessions.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "completions: select" on public.session_completions
for select
using (student_id = (select auth.uid()));

create policy "completions: insert" on public.session_completions
for insert
with check (student_id = (select auth.uid()));

create policy "completions: update" on public.session_completions
for update
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "completions: delete" on public.session_completions
for delete
using (student_id = (select auth.uid()));

create policy "mock_scores: select" on public.mock_scores
for select
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = mock_scores.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "mock_scores: insert" on public.mock_scores
for insert
with check (student_id = (select auth.uid()));

create policy "mock_scores: update" on public.mock_scores
for update
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "mock_scores: delete" on public.mock_scores
for delete
using (student_id = (select auth.uid()));

create policy "reflections: select" on public.weekly_reflections
for select
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = weekly_reflections.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "reflections: insert" on public.weekly_reflections
for insert
with check (student_id = (select auth.uid()));

create policy "reflections: update" on public.weekly_reflections
for update
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "reflections: delete" on public.weekly_reflections
for delete
using (student_id = (select auth.uid()));

create policy "plan_members: select" on public.plan_members
for select
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_members.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_members: insert" on public.plan_members
for insert
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_members.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_members: update" on public.plan_members
for update
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_members.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_members.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

create policy "plan_members: delete" on public.plan_members
for delete
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.plan_members pm
    where pm.plan_id = plan_members.plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  )
);

drop function if exists public.is_plan_student(uuid);
drop function if exists public.is_plan_tutor(uuid);

create index if not exists mock_scores_session_id_idx on public.mock_scores(session_id);
create index if not exists mock_scores_student_id_idx on public.mock_scores(student_id);
create index if not exists plan_days_plan_week_id_idx on public.plan_days(plan_week_id);
create index if not exists plans_student_id_idx on public.plans(student_id);
create index if not exists plans_tutor_id_idx on public.plans(tutor_id);
create index if not exists session_completions_student_id_idx on public.session_completions(student_id);
create index if not exists sessions_plan_day_id_idx on public.sessions(plan_day_id);
create index if not exists weekly_reflections_student_id_idx on public.weekly_reflections(student_id);
