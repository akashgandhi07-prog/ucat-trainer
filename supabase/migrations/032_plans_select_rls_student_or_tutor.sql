-- Restrict plans SELECT to the owning student or an explicitly linked tutor (plan_members).

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

comment on policy "plans: student or tutor select" on public.plans is
  'Student sees own plans; tutors see plans where they have plan_members.role = tutor.';
