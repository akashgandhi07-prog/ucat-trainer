-- Security hardening:
-- 1) Keep privilege-bearing profile columns writable only by trusted/server roles.
-- 2) Prevent clients from self-linking plan_members rows.
-- 3) Disable anonymous writes to high-volume public tables.

-- Profiles: users may maintain profile preferences, but not privilege/identity fields.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists stream text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists entry_year text;
alter table public.profiles add column if not exists email_marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists email_marketing_opt_in_at timestamptz;
alter table public.profiles add column if not exists ucat_exam_date date;

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, update on public.profiles from anon, authenticated;
grant insert (
  id,
  full_name,
  stream,
  first_name,
  last_name,
  entry_year,
  email_marketing_opt_in,
  email_marketing_opt_in_at,
  updated_at,
  ucat_exam_date
) on public.profiles to authenticated;
grant update (
  full_name,
  stream,
  first_name,
  last_name,
  entry_year,
  email_marketing_opt_in,
  email_marketing_opt_in_at,
  updated_at,
  ucat_exam_date
) on public.profiles to authenticated;

-- The auth trigger may still set planner_role='student' from invite/login metadata,
-- but tutor status must be provisioned server-side or by an admin SQL operation.
create or replace function public.handle_auth_user_profiles_planner_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text := trim(lower(coalesce(new.raw_user_meta_data->>'role', '')));
  pr text := null;
  fn text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
begin
  if meta_role = 'student' then pr := 'student'; end if;

  insert into public.profiles (id, email, planner_role, full_name, updated_at)
  values (new.id, new.email, pr, fn, now())
  on conflict (id) do update set
    email        = coalesce(excluded.email, profiles.email),
    planner_role = coalesce(excluded.planner_role, profiles.planner_role),
    full_name    = case
                     when excluded.full_name is not null and length(trim(excluded.full_name)) > 0
                       then excluded.full_name
                     else profiles.full_name
                   end,
    updated_at   = now();
  return new;
end;
$$;

revoke execute on function public.handle_auth_user_profiles_planner_sync() from public, anon, authenticated;
grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;

-- plan_members grants access to student plans. Direct client writes must be
-- scoped to plans owned by the caller, not merely rows where user_id=auth.uid().
drop policy if exists "plan_members: insert" on public.plan_members;
drop policy if exists "plan_members: update" on public.plan_members;
drop policy if exists "plan_members: delete" on public.plan_members;

create policy "plan_members: insert" on public.plan_members
  for insert with check (
    exists (
      select 1
      from public.plans p
      where p.id = plan_members.plan_id
        and p.student_id = (select auth.uid())
        and (
          (plan_members.role = 'student' and plan_members.user_id = (select auth.uid()))
          or plan_members.role = 'tutor'
        )
    )
    or exists (
      select 1
      from public.plans p
      where p.id = plan_members.plan_id
        and p.tutor_id = (select auth.uid())
        and plan_members.role = 'tutor'
    )
  );

create policy "plan_members: update" on public.plan_members
  for update
  using (
    exists (
      select 1
      from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
    )
  );

create policy "plan_members: delete" on public.plan_members
  for delete using (
    exists (
      select 1
      from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.student_id = (select auth.uid())
          or p.tutor_id = (select auth.uid())
        )
    )
  );

-- Anonymous analytics/question feedback are easy to spam with the public anon key.
-- Keep authenticated inserts; guests will fail closed until a rate-limited endpoint is added.
drop policy if exists "Anyone can insert analytics events" on public.analytics_events;
create policy "Authenticated users can insert analytics events"
  on public.analytics_events for insert
  to authenticated
  with check (user_id is null or user_id = (select auth.uid()));

drop policy if exists "Anyone can insert anonymous question feedback" on public.question_feedback;
