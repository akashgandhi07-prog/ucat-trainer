-- Performance (Supabase advisor 0003): wrap auth.* in subqueries so RLS initplan is stable.

alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can insert own profile" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can view own sessions" on public.sessions
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own sessions" on public.sessions
  with check ((select auth.uid()) = user_id);

alter policy "Users can view their own syllogism sessions" on public.syllogism_sessions
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own syllogism sessions" on public.syllogism_sessions
  with check ((select auth.uid()) = user_id);

alter policy "Users can insert bug reports" on public.bug_reports
  with check ((select auth.uid()) = user_id);

alter policy "Admins can view bug reports" on public.bug_reports
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Admins can update bug reports" on public.bug_reports
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Admins can view analytics events" on public.analytics_events
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Anyone can insert analytics events" on public.analytics_events
  with check (
    (((select auth.role()) = 'authenticated'::text) and ((user_id is null) or (user_id = (select auth.uid()))))
    or (((select auth.role()) = 'anon'::text) and (user_id is null))
  );

alter policy "Admins can view question feedback" on public.question_feedback
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

alter policy "Users can insert question feedback" on public.question_feedback
  with check ((user_id is null) or (user_id = (select auth.uid())));
