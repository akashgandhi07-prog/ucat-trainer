-- Fix infinite recursion in plan_members RLS policies.

drop policy if exists "plan_members: select" on public.plan_members;
drop policy if exists "plan_members: insert" on public.plan_members;
drop policy if exists "plan_members: update" on public.plan_members;
drop policy if exists "plan_members: delete" on public.plan_members;

create policy "plan_members: select" on public.plan_members
for select
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_members.plan_id
      and (
        p.tutor_id = (select auth.uid())
        or p.student_id = (select auth.uid())
      )
  )
);

create policy "plan_members: insert" on public.plan_members
for insert
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_members.plan_id
      and p.tutor_id = (select auth.uid())
  )
);

create policy "plan_members: update" on public.plan_members
for update
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_members.plan_id
      and p.tutor_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_members.plan_id
      and p.tutor_id = (select auth.uid())
  )
);

create policy "plan_members: delete" on public.plan_members
for delete
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_members.plan_id
      and p.tutor_id = (select auth.uid())
  )
);
