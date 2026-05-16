-- Plans INSERT + RETURNING needs a SELECT policy that matches the new row without
-- only relying on a definer lookup. Tutor-via-membership stays in a definer helper
-- that reads plan_members only (no plans <-> plan_members recursion).

create or replace function public.planner_user_is_linked_tutor(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plan_members pm
    where pm.plan_id = p_plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  );
$$;

revoke all on function public.planner_user_is_linked_tutor(uuid) from public;
grant execute on function public.planner_user_is_linked_tutor(uuid) to authenticated;

drop policy if exists "plans: student or tutor select" on public.plans;
create policy "plans: student or tutor select" on public.plans
  for select using (
    student_id = (select auth.uid())
    or tutor_id = (select auth.uid())
    or public.planner_user_is_linked_tutor(id)
  );

comment on policy "plans: student or tutor select" on public.plans is
  'Owner columns on plans, or linked tutor via plan_members (definer helper).';

drop policy if exists "plans: student_or_tutor_update" on public.plans;
create policy "plans: student_or_tutor_update" on public.plans
  for update
  using (
    student_id = (select auth.uid())
    or tutor_id = (select auth.uid())
    or public.planner_user_is_linked_tutor(id)
  )
  with check (
    student_id = (select auth.uid())
    or tutor_id = (select auth.uid())
    or public.planner_user_is_linked_tutor(id)
  );

-- Ensure clients can create their profile row before plans.student_id FK insert.
create or replace function public.ensure_profile_for_auth_user(
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_role text;
  v_pr text;
begin
  if v_uid is null then
    raise exception 'Must be authenticated';
  end if;

  select email, raw_user_meta_data
  into v_email, v_meta
  from auth.users
  where id = v_uid;

  v_role := trim(lower(coalesce(v_meta->>'role', '')));
  if v_role = 'student' then
    v_pr := 'student';
  elsif v_role = 'tutor' then
    v_pr := 'tutor';
  else
    v_pr := null;
  end if;

  insert into public.profiles (id, email, planner_role, full_name, updated_at)
  values (
    v_uid,
    v_email,
    v_pr,
    nullif(trim(coalesce(p_full_name, v_meta->>'full_name', v_meta->>'name', '')), ''),
    now()
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    planner_role = coalesce(excluded.planner_role, profiles.planner_role),
    full_name = case
      when excluded.full_name is not null and length(trim(excluded.full_name)) > 0
        then excluded.full_name
      else profiles.full_name
    end,
    updated_at = now();
end;
$$;

revoke all on function public.ensure_profile_for_auth_user(text) from public;
grant execute on function public.ensure_profile_for_auth_user(text) to authenticated;
