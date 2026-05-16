-- Fix infinite recursion: plans SELECT/UPDATE referenced plan_members while
-- plan_members policies reference plans (032 + 024/036).

create or replace function public.planner_user_can_access_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plans p
    where p.id = p_plan_id
      and (
        p.student_id = (select auth.uid())
        or p.tutor_id = (select auth.uid())
      )
  )
  or exists (
    select 1
    from public.plan_members pm
    where pm.plan_id = p_plan_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'tutor'
  );
$$;

revoke all on function public.planner_user_can_access_plan(uuid) from public;
grant execute on function public.planner_user_can_access_plan(uuid) to authenticated;

drop policy if exists "plans: student or tutor select" on public.plans;
create policy "plans: student or tutor select" on public.plans
  for select using (public.planner_user_can_access_plan(id));

comment on policy "plans: student or tutor select" on public.plans is
  'Student, plans.tutor_id, or plan_members tutor. Uses security definer helper to avoid RLS recursion.';

drop policy if exists "plans: student_or_tutor_update" on public.plans;
create policy "plans: student_or_tutor_update" on public.plans
  for update
  using (public.planner_user_can_access_plan(id))
  with check (public.planner_user_can_access_plan(id));
