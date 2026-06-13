-- Allow signed-out visitors to log analytics events.
--
-- trackEvent() in src/lib/analytics.ts deliberately fires for guests (most traffic
-- on a free tool) with user_id = null, but only `authenticated` had an INSERT
-- policy, so every guest page view produced a failing POST (401/RLS warning in the
-- console and Supabase API logs). Anonymous rows must be anonymous: user_id stays
-- null, so a guest can never write an event attributed to a real account.
-- SELECT remains admin-only (existing "Admins can view analytics events" policy).

create policy "Anon visitors can insert anonymous analytics events"
  on public.analytics_events
  for insert
  to anon
  with check (user_id is null);
