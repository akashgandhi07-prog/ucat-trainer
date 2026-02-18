-- Analytics events table for product analytics (page views, trainer events, auth, feature usage).
-- RLS: INSERT allowed for anon and authenticated; SELECT admin-only.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_name text not null,
  event_properties jsonb default '{}',
  pathname text,
  referrer text,
  created_at timestamptz not null default now()
);

create index analytics_events_user_created on public.analytics_events(user_id, created_at) where user_id is not null;
create index analytics_events_name_created on public.analytics_events(event_name, created_at);
create index analytics_events_session on public.analytics_events(session_id, created_at);

alter table public.analytics_events enable row level security;

-- Allow anyone (anon + authenticated) to insert analytics events.
-- For authenticated: user_id can be their own id or null.
-- For anon: user_id must be null (guests).
drop policy if exists "Anyone can insert analytics events" on public.analytics_events;
create policy "Anyone can insert analytics events"
  on public.analytics_events for insert
  with check (
    (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()))
    or
    (auth.role() = 'anon' and user_id is null)
  );

-- Admin-only select: users with role 'admin' in profiles can read.
drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events"
  on public.analytics_events for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

comment on table public.analytics_events is
  'Product analytics events: page views, trainer usage, auth, feature usage. Used for funnel and session-length analysis.';
