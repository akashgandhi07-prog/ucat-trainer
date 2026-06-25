-- Concatenation of supabase/migrations/*.sql (non-underscore) in sorted order.
-- For DBA review / greenfield apply; do not blindly re-run on prod with existing history.


-- ========== 001_profiles.sql ==========
-- Profiles table: stores display name (and other profile fields) for auth.users.
-- Run this in the Supabase SQL editor or via Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  updated_at timestamptz not null default now()
);

-- RLS: users can read and update their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Optional: create profile on signup via trigger (alternative to app-side upsert)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row
  execute function public.handle_new_user();

comment on table public.profiles is 'User profile (display name etc). Synced from auth.users.raw_user_meta_data on sign-in.';


-- ========== 002_sessions_time_seconds.sql ==========
-- Optional time_seconds for keyword_scanning (and rapid_recall) sessions.
-- Run in Supabase SQL editor or via Supabase CLI.

alter table public.sessions
  add column if not exists time_seconds integer;

comment on column public.sessions.time_seconds is 'Duration in seconds (e.g. scan time for keyword_scanning, reading window for rapid_recall).';


-- ========== 002_sessions.sql ==========
-- Sessions table: training session records per user.
-- RLS restricts so users only see/insert their own rows.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  training_type text not null check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning')),
  wpm integer,
  correct integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  passage_id text,
  wpm_rating text check (wpm_rating is null or wpm_rating in ('too_slow', 'slightly_slow', 'just_right', 'slightly_fast', 'too_fast')),
  time_seconds integer
);

create index if not exists sessions_user_id_created_at on public.sessions (user_id, created_at);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

comment on table public.sessions is 'Training sessions (speed reading, rapid recall, keyword scanning).';


-- ========== 003_bug_reports.sql ==========
-- Bug reports: users can submit; only admins can read (via RLS).
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null,
  page_url text,
  created_at timestamptz not null default now()
);

create index if not exists bug_reports_created_at on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- Authenticated users can insert their own report (user_id set to auth.uid()).
create policy "Users can insert bug reports"
  on public.bug_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can select (policy added in 004_profiles_role after role column exists).
-- For now, no SELECT so only backend/admin tools with service role can read.
comment on table public.bug_reports is 'User-submitted bug reports; admin-only read.';


-- ========== 004_profiles_role_admin.sql ==========
-- Add role to profiles (default 'user'); admins have role = 'admin'.
-- To set the first admin, run: update public.profiles set role = 'admin' where id = 'your-auth-user-uuid';
alter table public.profiles
  add column if not exists role text not null default 'user';

update public.profiles set role = 'user' where role is null;

-- Admins can read all bug reports (for admin dashboard).
create policy "Admins can view bug reports"
  on public.bug_reports for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RPC: return admin stats (user count from profiles, session counts). Only callable by admins.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'bug_reports_count', (select count(*)::int from public.bug_reports)
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is 'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';


-- ========== 005_bug_reports_type.sql ==========
-- Add type to bug_reports: 'bug' | 'suggestion' for unified feedback logging.
alter table public.bug_reports
  add column if not exists type text not null default 'bug';

alter table public.bug_reports
  add constraint bug_reports_type_check check (type in ('bug', 'suggestion'));

-- Update get_admin_stats to return separate bug and suggestion counts.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion')
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is 'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';


-- ========== 006_drop_handle_new_user_trigger.sql ==========
-- Drop auth trigger that created profiles on signup. It caused "Database error saving new user"
-- because RLS blocks the insert when there is no session yet. Profiles are now created in the app
-- on first sign-in (useAuth + upsertProfile).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();


-- ========== 007_sessions_add_calculator_type.sql ==========
-- Extend sessions.training_type to support the calculator trainer.
-- This keeps existing types and simply adds 'calculator' as an allowed value.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator'));



-- ========== 008_sessions_add_inference_trainer_type.sql ==========
-- Extend sessions.training_type to support the inference trainer.
-- Run this after 007_sessions_add_calculator_type.sql

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator', 'inference_trainer'));


-- ========== 009_create_syllogism_tables.sql ==========
-- Migration: Create Syllogism Trainer tables
-- Tables for storing generated syllogism questions and user session performance.

-- ─────────────────────────────────────────────────────────────────────────────
-- syllogism_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.syllogism_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    macro_block_id UUID DEFAULT gen_random_uuid(),
    stimulus_text TEXT NOT NULL,
    conclusion_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    logic_group TEXT NOT NULL CHECK (logic_group IN ('categorical', 'relative', 'majority', 'complex')),
    trick_type TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.syllogism_questions IS 'Programmatically generated syllogism questions; macro_block_id groups five conclusions per stimulus for Macro Drill.';

ALTER TABLE public.syllogism_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to syllogism questions"
    ON public.syllogism_questions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- syllogism_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.syllogism_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('micro', 'macro')),
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    average_time_per_decision NUMERIC NOT NULL,
    categorical_accuracy NUMERIC CHECK (categorical_accuracy IS NULL OR (categorical_accuracy >= 0 AND categorical_accuracy <= 1)),
    relative_accuracy NUMERIC CHECK (relative_accuracy IS NULL OR (relative_accuracy >= 0 AND relative_accuracy <= 1)),
    majority_accuracy NUMERIC CHECK (majority_accuracy IS NULL OR (majority_accuracy >= 0 AND majority_accuracy <= 1)),
    complex_accuracy NUMERIC CHECK (complex_accuracy IS NULL OR (complex_accuracy >= 0 AND complex_accuracy <= 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.syllogism_sessions IS 'User syllogism drill sessions with aggregate accuracy per logic group.';

ALTER TABLE public.syllogism_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own syllogism sessions"
    ON public.syllogism_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own syllogism sessions"
    ON public.syllogism_sessions FOR SELECT USING (auth.uid() = user_id);


-- ========== 010_create_analytics_events.sql ==========
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


-- ========== 011_extend_admin_stats.sql ==========
-- Extend get_admin_stats to include calculator, inference_trainer, and syllogism session counts.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'sessions_calculator', (select count(*)::int from public.sessions where training_type = 'calculator'),
    'sessions_inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer'),
    'syllogism_sessions_count', (select count(*)::int from public.syllogism_sessions),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion')
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is
  'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';


-- ========== 012_admin_analytics_and_date_range.sql ==========
-- Admin stats with optional date range; analytics summary RPC for admin dashboard.

-- 1) get_admin_stats with optional since_ts, until_ts (null = all time)
create or replace function public.get_admin_stats(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_calculator', (select count(*)::int from public.sessions where training_type = 'calculator'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_sessions_count', (select count(*)::int from public.syllogism_sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats(timestamptz, timestamptz) is
  'Returns aggregate stats for admin dashboard, optionally filtered by date range. Admin only.';

-- 2) get_analytics_summary(since_ts, until_ts) - admin-only aggregated analytics
create or replace function public.get_analytics_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  event_counts jsonb;
  by_day jsonb;
  trainer_by_type jsonb;
  funnel jsonb;
  unique_sessions int;
  unique_users int;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb)
  into event_counts
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  with funnel_raw as (
    select event_properties->>'training_type' as tt, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_name in ('trainer_opened', 'trainer_started', 'trainer_completed', 'trainer_abandoned')
    group by event_properties->>'training_type', event_name
  )
  select coalesce(jsonb_object_agg(tt, funnel_obj), '{}'::jsonb)
  into funnel
  from (
    select tt, jsonb_object_agg(event_name, c) as funnel_obj
    from funnel_raw
    group by tt
  ) f;

  with day_events as (
    select date_trunc('day', created_at)::date as d, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by date_trunc('day', created_at)::date, event_name
  ),
  days_agg as (
    select d, jsonb_object_agg(event_name, c) as events
    from day_events
    group by d
  )
  select coalesce(jsonb_agg(jsonb_build_object('date', d, 'events', events) order by d), '[]'::jsonb)
  into by_day
  from days_agg;

  select coalesce(jsonb_object_agg(training_type, cnt), '{}'::jsonb)
  into trainer_by_type
  from (
    select event_properties->>'training_type' as training_type, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_properties->>'training_type' is not null
      and event_properties->>'training_type' <> ''
    group by event_properties->>'training_type'
  ) t;

  select count(distinct session_id)::int into unique_sessions
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(distinct user_id)::int into unique_users
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    and user_id is not null;

  return jsonb_build_object(
    'event_counts', event_counts,
    'by_day', by_day,
    'trainer_by_type', trainer_by_type,
    'funnel', funnel,
    'unique_sessions', unique_sessions,
    'unique_users', unique_users
  );
end;
$$;

comment on function public.get_analytics_summary(timestamptz, timestamptz) is
  'Returns aggregated analytics events for admin dashboard (event counts, by day, trainer by type, unique sessions/users). Admin only.';


-- ========== 013_sessions_add_mental_maths_type.sql ==========
-- Extend sessions.training_type to support the mental maths trainer.
-- Extend sessions.difficulty to allow stage_1..stage_4 for mental_maths.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator', 'inference_trainer', 'mental_maths'));

alter table public.sessions drop constraint if exists sessions_difficulty_check;

alter table public.sessions add constraint sessions_difficulty_check
  check (
    difficulty is null
    or difficulty in (
      'easy', 'medium', 'hard',
      'sprint', 'fingerTwister', 'memory', 'stages', 'free',
      'stage_1', 'stage_2', 'stage_3', 'stage_4'
    )
  );


-- ========== 014_security_constraints.sql ==========
-- Security: add length/size constraints to profiles and analytics_events to prevent DoS and storage abuse.
-- Run after ensuring existing data complies (e.g. truncate oversize values if any).

-- Profiles
alter table public.profiles drop constraint if exists profiles_full_name_length_check;
alter table public.profiles add constraint profiles_full_name_length_check
  check (full_name is null or length(full_name) <= 500);
alter table public.profiles drop constraint if exists profiles_first_name_length_check;
alter table public.profiles add constraint profiles_first_name_length_check
  check (first_name is null or length(first_name) <= 200);
alter table public.profiles drop constraint if exists profiles_last_name_length_check;
alter table public.profiles add constraint profiles_last_name_length_check
  check (last_name is null or length(last_name) <= 200);
alter table public.profiles drop constraint if exists profiles_entry_year_length_check;
alter table public.profiles add constraint profiles_entry_year_length_check
  check (entry_year is null or length(entry_year) <= 20);

-- Analytics events
alter table public.analytics_events drop constraint if exists analytics_events_session_id_length_check;
alter table public.analytics_events add constraint analytics_events_session_id_length_check
  check (length(session_id) <= 64);
alter table public.analytics_events drop constraint if exists analytics_events_event_name_length_check;
alter table public.analytics_events add constraint analytics_events_event_name_length_check
  check (length(event_name) <= 128);
alter table public.analytics_events drop constraint if exists analytics_events_pathname_length_check;
alter table public.analytics_events add constraint analytics_events_pathname_length_check
  check (pathname is null or length(pathname) <= 2048);
alter table public.analytics_events drop constraint if exists analytics_events_referrer_length_check;
alter table public.analytics_events add constraint analytics_events_referrer_length_check
  check (referrer is null or length(referrer) <= 2048);
alter table public.analytics_events drop constraint if exists analytics_events_event_properties_check;
alter table public.analytics_events add constraint analytics_events_event_properties_check
  check (jsonb_typeof(event_properties) = 'object' and length(event_properties::text) <= 10000);


-- ========== 015_admin_usage_summary.sql ==========
-- Admin usage summary: per-user activity, trainer popularity, guest usage, questions.
-- Single RPC for the admin dashboard; admin-only, SECURITY DEFINER.

create or replace function public.get_admin_usage_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_sessions int;
  total_questions bigint;
  active_users int;
  guest_sessions int;
  new_users int;
  trainer_usage jsonb;
  guest_activity jsonb;
  users_arr jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  -- Summary counts
  select count(*)::int into total_sessions
  from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select coalesce(sum(s.total), 0) into total_questions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);
  select total_questions + coalesce(sum(ss.total_questions), 0) into total_questions
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select count(distinct u.user_id)::int into active_users
  from (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ) u;

  select count(distinct session_id)::int into guest_sessions
  from public.analytics_events
  where user_id is null
    and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(*)::int into new_users
  from public.profiles p
  where p.created_at is not null
    and (since_ts is null or p.created_at >= since_ts) and (until_ts is null or p.created_at <= until_ts);

  -- Trainer usage (sessions table + syllogism by mode)
  select jsonb_build_object(
    'speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select count(*)::int from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select count(*)::int from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select count(*)::int from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_usage;

  -- Guest activity: event_name -> count
  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into guest_activity
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where user_id is null
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  -- Per-user rows
  with active_user_ids as (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      max(s.created_at) as last_sess
    from public.sessions s
    where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.user_id,
      'email', coalesce(trim(p.email), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)) desc nulls last
  ), '[]'::jsonb) into users_arr
  from active_user_ids u
  left join public.profiles p on p.id = u.user_id
  left join user_sess us on us.user_id = u.user_id
  left join user_syll sy on sy.user_id = u.user_id;

  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sessions', total_sessions,
      'total_questions', total_questions,
      'active_users', active_users,
      'guest_sessions', guest_sessions,
      'new_users', new_users
    ),
    'trainer_usage', trainer_usage,
    'guest_activity', guest_activity,
    'users', users_arr
  );
  return result;
end;
$$;

comment on function public.get_admin_usage_summary(timestamptz, timestamptz) is
  'Returns usage summary, trainer counts, guest activity, and per-user activity for admin dashboard. Admin only.';

-- Ensure get_admin_stats returns mental_maths for consistency with full schema
create or replace function public.get_admin_stats(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_calculator', (select count(*)::int from public.sessions where training_type = 'calculator'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_sessions_count', (select count(*)::int from public.syllogism_sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into result;
  return result;
end;
$$;


-- ========== 016_admin_usage_questions_and_accuracy.sql ==========
-- Add questions per trainer type and per-user session accuracy to admin usage summary.

create or replace function public.get_admin_usage_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_sessions int;
  total_questions bigint;
  active_users int;
  guest_sessions int;
  new_users int;
  trainer_usage jsonb;
  trainer_questions jsonb;
  guest_activity jsonb;
  users_arr jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::int into total_sessions
  from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select coalesce(sum(s.total), 0) into total_questions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);
  select total_questions + coalesce(sum(ss.total_questions), 0) into total_questions
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select count(distinct u.user_id)::int into active_users
  from (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ) u;

  select count(distinct session_id)::int into guest_sessions
  from public.analytics_events
  where user_id is null
    and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(*)::int into new_users
  from public.profiles p
  where p.created_at is not null
    and (since_ts is null or p.created_at >= since_ts) and (until_ts is null or p.created_at <= until_ts);

  -- Trainer usage: session counts
  select jsonb_build_object(
    'speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select count(*)::int from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select count(*)::int from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select count(*)::int from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_usage;

  -- Trainer questions: sum of questions attempted per trainer type
  select jsonb_build_object(
    'speed_reading', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select coalesce(sum(total_questions), 0)::bigint from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select coalesce(sum(total_questions), 0)::bigint from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_questions;

  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into guest_activity
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where user_id is null
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  -- Per-user rows: add session_correct for accuracy %
  with active_user_ids as (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      max(s.created_at) as last_sess
    from public.sessions s
    where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.user_id,
      'email', coalesce(trim(p.email), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)) desc nulls last
  ), '[]'::jsonb) into users_arr
  from active_user_ids u
  left join public.profiles p on p.id = u.user_id
  left join user_sess us on us.user_id = u.user_id
  left join user_syll sy on sy.user_id = u.user_id;

  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sessions', total_sessions,
      'total_questions', total_questions,
      'active_users', active_users,
      'guest_sessions', guest_sessions,
      'new_users', new_users
    ),
    'trainer_usage', trainer_usage,
    'trainer_questions', trainer_questions,
    'guest_activity', guest_activity,
    'users', users_arr
  );
  return result;
end;
$$;

comment on function public.get_admin_usage_summary(timestamptz, timestamptz) is
  'Returns usage summary, trainer sessions and questions, guest activity, and per-user activity (with session accuracy). Admin only.';


-- ========== 017_admin_usage_names_time_wpm_days.sql ==========
-- Add display name, time spent, WPM, and days active to admin usage summary.

create or replace function public.get_admin_usage_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_sessions int;
  total_questions bigint;
  active_users int;
  guest_sessions int;
  new_users int;
  total_time_seconds bigint;
  trainer_usage jsonb;
  trainer_questions jsonb;
  trainer_time_seconds jsonb;
  guest_activity jsonb;
  users_arr jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::int into total_sessions
  from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select coalesce(sum(s.total), 0) into total_questions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);
  select total_questions + coalesce(sum(ss.total_questions), 0) into total_questions
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select count(distinct u.user_id)::int into active_users
  from (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ) u;

  select count(distinct session_id)::int into guest_sessions
  from public.analytics_events
  where user_id is null
    and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(*)::int into new_users
  from public.profiles p
  where p.created_at is not null
    and (since_ts is null or p.created_at >= since_ts) and (until_ts is null or p.created_at <= until_ts);

  -- Total time (all users): sessions.time_seconds + syllogism (average_time_per_decision * total_questions per session)
  select coalesce(sum(coalesce(s.time_seconds, 0)), 0) into total_time_seconds from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);
  select total_time_seconds + coalesce(sum((ss.average_time_per_decision * ss.total_questions)::bigint), 0) into total_time_seconds
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select jsonb_build_object(
    'speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select count(*)::int from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select count(*)::int from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select count(*)::int from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_usage;

  select jsonb_build_object(
    'speed_reading', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select coalesce(sum(total), 0)::bigint from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select coalesce(sum(total_questions), 0)::bigint from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select coalesce(sum(total_questions), 0)::bigint from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_questions;

  -- Time per trainer type (seconds)
  select jsonb_build_object(
    'speed_reading', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select coalesce(sum(coalesce(time_seconds, 0)), 0)::bigint from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_time_seconds;

  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into guest_activity
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where user_id is null
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  -- Per-user rows: add display_name, total_time_seconds, days_active, last_wpm, avg_wpm
  with active_user_ids as (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0) as total_session_seconds,
      (array_agg(s.wpm order by s.created_at desc) filter (where s.training_type = 'speed_reading' and s.wpm is not null))[1] as last_wpm,
      avg(s.wpm) filter (where s.training_type = 'speed_reading' and s.wpm is not null) as avg_wpm,
      max(s.created_at) as last_sess
    from public.sessions s
    where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) as syllogism_seconds,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by user_id
  ),
  user_days as (
    select user_id, count(distinct d)::int as days_active
    from (
      select user_id, date(created_at) as d from public.sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      union
      select user_id, date(created_at) from public.syllogism_sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.user_id,
      'email', coalesce(trim(p.email), ''),
      'display_name', coalesce(nullif(trim(p.full_name), ''), nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' '), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)) desc nulls last
  ), '[]'::jsonb) into users_arr
  from active_user_ids u
  left join public.profiles p on p.id = u.user_id
  left join user_sess us on us.user_id = u.user_id
  left join user_syll sy on sy.user_id = u.user_id
  left join user_days ud on ud.user_id = u.user_id;

  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sessions', total_sessions,
      'total_questions', total_questions,
      'total_time_seconds', total_time_seconds,
      'active_users', active_users,
      'guest_sessions', guest_sessions,
      'new_users', new_users
    ),
    'trainer_usage', trainer_usage,
    'trainer_questions', trainer_questions,
    'trainer_time_seconds', trainer_time_seconds,
    'guest_activity', guest_activity,
    'users', users_arr
  );
  return result;
end;
$$;

comment on function public.get_admin_usage_summary(timestamptz, timestamptz) is
  'Returns usage summary (incl. total time), trainer sessions/questions/time, guest activity, and per-user activity (name, time, WPM, days active). Admin only.';


-- ========== 018_mailchimp_signup_webhook.sql ==========
-- Mailchimp registration sync: on auth.users INSERT we POST to the Edge Function
-- with a webhook secret so new users are added to Mailchimp without relying on
-- client session (works even when "Confirm email" is required).

create extension if not exists pg_net;

-- Config: URL and secret must match MAILCHIMP_WEBHOOK_SECRET in Edge Function secrets.
-- Replace placeholder URL and secret after deployment.
create table if not exists public.mailchimp_webhook_config (
  key text primary key,
  value text
);

insert into public.mailchimp_webhook_config (key, value) values
  ('edge_function_url', 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/add-mailchimp-subscriber'),
  ('webhook_secret', 'REPLACE_WITH_SAME_VALUE_AS_MAILCHIMP_WEBHOOK_SECRET')
on conflict (key) do nothing;

create or replace function public.trigger_mailchimp_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_url text;
  secret text;
  req_body jsonb;
  request_id bigint;
begin
  select value into edge_url from public.mailchimp_webhook_config where key = 'edge_function_url';
  select value into secret from public.mailchimp_webhook_config where key = 'webhook_secret';

  if edge_url is null or trim(edge_url) = '' or edge_url like '%REPLACE_WITH%' then
    return new;
  end if;
  if secret is null or trim(secret) = '' or secret like '%REPLACE_WITH%' then
    return new;
  end if;

  req_body := jsonb_build_object(
    'secret', secret,
    'record', jsonb_build_object(
      'email', new.email,
      'raw_user_meta_data', coalesce(new.raw_user_meta_data, '{}'::jsonb)
    )
  );

  request_id := net.http_post(
    url := edge_url,
    body := req_body,
    params := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mailchimp on auth.users;
create trigger on_auth_user_created_mailchimp
  after insert on auth.users
  for each row
  execute function public.trigger_mailchimp_on_signup();

comment on table public.mailchimp_webhook_config is 'Config for Mailchimp signup webhook: edge_function_url and webhook_secret (same as MAILCHIMP_WEBHOOK_SECRET).';


-- ========== 019_get_admin_new_users.sql ==========
-- New users by signup date with full name and activity (what they looked at and did).
-- Admin-only. Used by admin dashboard "New users by date" section.

create or replace function public.get_admin_new_users(
  since_ts timestamptz default null,
  until_ts timestamptz default null,
  limit_rows int default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  with new_profiles as (
    select id, full_name, first_name, last_name, created_at, email
    from public.profiles
    where (since_ts is null or created_at >= since_ts)
      and (until_ts is null or created_at <= until_ts)
    order by created_at desc
    limit limit_rows
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct
    from public.sessions s
    where s.user_id in (select id from new_profiles)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions
    from public.syllogism_sessions
    where user_id in (select id from new_profiles)
    group by user_id
  ),
  user_events as (
    select
      user_id,
      coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) as event_counts
    from (
      select user_id, event_name, count(*)::int as cnt
      from public.analytics_events
      where user_id is not null
        and user_id in (select id from new_profiles)
      group by user_id, event_name
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'full_name', coalesce(nullif(trim(p.full_name), ''), nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' '), ''),
      'created_at', p.created_at,
      'email', coalesce(trim(p.email), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'event_counts', coalesce(ue.event_counts, '{}'::jsonb)
    ) order by p.created_at desc
  ), '[]'::jsonb) into result
  from new_profiles p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_events ue on ue.user_id = p.id;

  return result;
end;
$$;

comment on function public.get_admin_new_users(timestamptz, timestamptz, int) is
  'Returns new users by signup date (full name, email, activity). Admin only.';

-- ========== 020_analytics_signups_by_day.sql ==========
-- Add signups_by_day to get_analytics_summary for "New sign-ups over time" chart on admin dashboard.

create or replace function public.get_analytics_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  event_counts jsonb;
  by_day jsonb;
  trainer_by_type jsonb;
  funnel jsonb;
  unique_sessions int;
  unique_users int;
  signups_by_day jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb)
  into event_counts
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  with funnel_raw as (
    select event_properties->>'training_type' as tt, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_name in ('trainer_opened', 'trainer_started', 'trainer_completed', 'trainer_abandoned')
    group by event_properties->>'training_type', event_name
  )
  select coalesce(jsonb_object_agg(tt, funnel_obj), '{}'::jsonb)
  into funnel
  from (
    select tt, jsonb_object_agg(event_name, c) as funnel_obj
    from funnel_raw
    group by tt
  ) f;

  with day_events as (
    select date_trunc('day', created_at)::date as d, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by date_trunc('day', created_at)::date, event_name
  ),
  days_agg as (
    select d, jsonb_object_agg(event_name, c) as events
    from day_events
    group by d
  )
  select coalesce(jsonb_agg(jsonb_build_object('date', d, 'events', events) order by d), '[]'::jsonb)
  into by_day
  from days_agg;

  select coalesce(jsonb_object_agg(training_type, cnt), '{}'::jsonb)
  into trainer_by_type
  from (
    select event_properties->>'training_type' as training_type, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_properties->>'training_type' is not null
      and event_properties->>'training_type' <> ''
    group by event_properties->>'training_type'
  ) t;

  select count(distinct session_id)::int into unique_sessions
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(distinct user_id)::int into unique_users
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    and user_id is not null;

  -- Sign-ups per day (profiles.created_at in range)
  select coalesce(jsonb_agg(jsonb_build_object('date', d::text, 'signups', signups) order by d), '[]'::jsonb)
  into signups_by_day
  from (
    select date(created_at) as d, count(*)::int as signups
    from public.profiles
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by date(created_at)
  ) sbd;

  return jsonb_build_object(
    'event_counts', event_counts,
    'by_day', by_day,
    'trainer_by_type', trainer_by_type,
    'funnel', funnel,
    'unique_sessions', unique_sessions,
    'unique_users', unique_users,
    'signups_by_day', signups_by_day
  );
end;
$$;

comment on function public.get_analytics_summary(timestamptz, timestamptz) is
  'Returns aggregated analytics events for admin dashboard (event counts, by day, trainer by type, unique sessions/users, signups by day). Admin only.';


-- ========== 021_question_feedback.sql ==========
-- Per-question feedback for DM & VR trainers.
-- Stores structured reports about individual questions so admins can review content quality.

create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  trainer_type text not null,
  question_kind text not null,
  question_identifier text not null,
  issue_type text not null,
  comment text,
  passage_id text,
  session_id uuid,
  page_url text,
  created_at timestamptz not null default now()
);

-- Enumerated issue types: keep in sync with frontend QuestionFeedbackIssueType.
alter table public.question_feedback drop constraint if exists question_feedback_issue_type_check;
alter table public.question_feedback add constraint question_feedback_issue_type_check
  check (issue_type in ('wrong_answer', 'unclear_wording', 'too_hard', 'too_easy', 'typo', 'other'));

-- Length limits to prevent abuse.
alter table public.question_feedback drop constraint if exists question_feedback_comment_length_check;
alter table public.question_feedback add constraint question_feedback_comment_length_check
  check (comment is null or length(comment) <= 1000);

alter table public.question_feedback drop constraint if exists question_feedback_page_url_length_check;
alter table public.question_feedback add constraint question_feedback_page_url_length_check
  check (page_url is null or length(page_url) <= 255);

-- Indexes to support admin queries by question and recency.
create index if not exists question_feedback_question_idx
  on public.question_feedback (trainer_type, question_kind, question_identifier);

create index if not exists question_feedback_created_at
  on public.question_feedback (created_at desc);

-- RLS: allow inserts from authenticated users (optionally linked to their user_id),
-- and anonymous inserts when user_id is null. Only admins can read.
alter table public.question_feedback enable row level security;

drop policy if exists "Users can insert question feedback" on public.question_feedback;
create policy "Users can insert question feedback"
  on public.question_feedback for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Anyone can insert anonymous question feedback" on public.question_feedback;
create policy "Anyone can insert anonymous question feedback"
  on public.question_feedback for insert
  to anon
  with check (user_id is null);

drop policy if exists "Admins can view question feedback" on public.question_feedback;
create policy "Admins can view question feedback"
  on public.question_feedback for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

comment on table public.question_feedback is
  'Per-question feedback (issue type + optional comment) for Decision Making and Verbal Reasoning trainers.';



-- ========== 022_admin_registrations_overview.sql ==========
-- Admin registrations overview: all profiles with usage aggregates.
-- Admin-only, SECURITY DEFINER. Used by the admin dashboard to list
-- all registrations (students) with what they have been using.

create or replace function public.get_admin_registrations_overview(limit_rows int default 5000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  with profiles_base as (
    select
      id,
      created_at,
      full_name,
      first_name,
      last_name,
      email
    from public.profiles
    order by created_at desc nulls last
    limit coalesce(limit_rows, 5000)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0) as total_session_seconds,
      (array_agg(s.wpm order by s.created_at desc) filter (where s.training_type = 'speed_reading' and s.wpm is not null))[1] as last_wpm,
      avg(s.wpm) filter (where s.training_type = 'speed_reading' and s.wpm is not null) as avg_wpm,
      max(s.created_at) as last_sess
    from public.sessions s
    where s.user_id in (select id from profiles_base)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) as syllogism_seconds,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where user_id in (select id from profiles_base)
    group by user_id
  ),
  user_days as (
    select user_id, count(distinct d)::int as days_active
    from (
      select user_id, date(created_at) as d
      from public.sessions
      where user_id in (select id from profiles_base)
      union
      select user_id, date(created_at) as d
      from public.syllogism_sessions
      where user_id in (select id from profiles_base)
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'email', coalesce(trim(p.email), ''),
      'display_name', coalesce(
        nullif(trim(p.full_name), ''),
        nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' ')
      , ''),
      'created_at', p.created_at,
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by p.created_at desc nulls last
  ), '[]'::jsonb) into result
  from profiles_base p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_days ud on ud.user_id = p.id;

  return result;
end;
$$;

comment on function public.get_admin_registrations_overview(int) is
  'Returns all registrations (profiles) with per-trainer usage and totals across all time. Admin only.';



-- ========== 022_bug_reports_archive.sql ==========
-- Add archived state to bug_reports so admins can archive feedback
-- without deleting it, and add an update policy for admins.

alter table public.bug_reports
  add column if not exists archived_at timestamptz;

create index if not exists bug_reports_archived_at_created_at_idx
  on public.bug_reports (archived_at nulls first, created_at desc);

-- Allow admins to update bug_reports (used for archive/unarchive).
drop policy if exists "Admins can update bug reports" on public.bug_reports;
create policy "Admins can update bug reports"
  on public.bug_reports for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );



-- ========== 024_planner_unified_plan_sessions.sql ==========
-- UCAT Planner on Skills DB: prefixed plan_* tables + profiles identity.
-- Drill telemetry remains public.sessions (trainer).

-- ─── profiles: planner facet ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists planner_role text
    check (
      planner_role is null
      or planner_role in ('student', 'tutor')
    );

comment on column public.profiles.planner_role is
  'Planner app role from auth metadata OTP; NULL = trainer-only or not set';

-- Sync auth signup into profiles (trainer app already uses profiles row)
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
    email          = coalesce(excluded.email, profiles.email),
    planner_role   = coalesce(excluded.planner_role, profiles.planner_role),
    full_name      = case
                       when excluded.full_name is not null and length(trim(excluded.full_name)) > 0
                         then excluded.full_name
                       else profiles.full_name
                     end,
    updated_at     = now();
  return new;
end;
$$;

revoke all on function public.handle_auth_user_profiles_planner_sync() from public;
grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_profiles_planner_sync();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Core planner tables ─────────────────────────────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid references public.profiles(id) on delete set null,
  exam_date date not null,
  exam_time time,
  current_situation text
    check (
      current_situation is null
      or current_situation in (
        'school', 'gap_year', 'graduated_free', 'graduated_working'
      )
    ),
  school_year text
    check (
      school_year is null or school_year in ('year_12', 'year_13', 'other')
    ),
  school_day_hours numeric(4,2) not null default 2.0,
  weekend_hours numeric(4,2) not null default 4.0,
  holiday_periods jsonb not null default '[]',
  has_prior_experience boolean not null default false,
  confidence_vr smallint not null default 3 check (confidence_vr between 1 and 5),
  confidence_dm smallint not null default 3 check (confidence_dm between 1 and 5),
  confidence_qr smallint not null default 3 check (confidence_qr between 1 and 5),
  confidence_sjt smallint not null default 3 check (confidence_sjt between 1 and 5),
  rest_days integer[] not null default '{}',
  ucat_sen boolean not null default false,
  status text not null default 'active' check (
    status in ('active', 'completed', 'archived')
  ),
  mock_target_total smallint check (
    mock_target_total is null or mock_target_total between 900 and 2700
  ),
  mock_target_sjt_band smallint check (
    mock_target_sjt_band is null or mock_target_sjt_band between 1 and 4
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_number integer not null,
  week_start date not null,
  week_type text not null default 'school'
    check (week_type in ('school', 'holiday')),
  default_hours numeric(4,2) not null default 2.0,
  difficulty_rating smallint check (
    difficulty_rating between 1 and 3
  ),
  is_locked boolean not null default false,
  tutor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

create table if not exists public.student_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_student_id uuid references public.profiles(id)
    on delete set null
);

create index if not exists student_invite_links_tutor_idx
  on public.student_invite_links (tutor_id);
create index if not exists student_invite_links_pending_idx
  on public.student_invite_links (token) where redeemed_at is null;

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_week_id uuid references public.plan_weeks(id)
    on delete set null,
  day_date date not null,
  availability text not null default 'available'
    check (availability in ('available', 'reduced', 'unavailable')),
  custom_hours numeric(4,2),
  is_rest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, day_date)
);

-- Timetable sessions (distinct from trainer public.sessions)
create table if not exists public.plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_day_id uuid references public.plan_days(id) on delete cascade,
  day_date date not null,
  session_type text not null check (session_type in (
    'vr_practice', 'dm_practice', 'qr_practice', 'sjt_practice',
    'mini_mock', 'full_mock', 'reflection', 'rest'
  )),
  duration_minutes integer not null default 60,
  position integer not null default 0,
  is_timed boolean not null default false,
  notes text,
  planner_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.plan_sessions(id)
    on delete cascade,
  student_id uuid not null references public.profiles(id)
    on delete cascade,
  minutes_completed integer not null default 0
    check (minutes_completed >= 0),
  perceived_effort smallint check (
    perceived_effort is null or perceived_effort between 1 and 5
  ),
  completed_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.extra_study_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id)
    on delete cascade,
  day_date date not null,
  section text not null check (section in ('vr', 'dm', 'qr', 'sjt')),
  minutes integer not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, student_id, day_date, section)
);

create table if not exists public.mock_scores (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id)
    on delete cascade,
  session_id uuid references public.plan_sessions(id)
    on delete set null,
  logged_date date not null default current_date,
  week_number integer,
  score_vr smallint check (score_vr between 300 and 900),
  score_dm smallint check (score_dm between 300 and 900),
  score_qr smallint check (score_qr between 300 and 900),
  score_sjt smallint check (score_sjt between 1 and 4),
  mock_type text not null default 'full'
    check (mock_type in ('full', 'mini')),
  mock_source text check (mock_source in (
    'medify', 'medentry', 'passmedicine', 'book', 'official'
  )),
  weakness_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id)
    on delete cascade,
  week_number integer not null,
  reflection_text text not null,
  difficulty_rating smallint not null check (difficulty_rating between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

create table if not exists public.plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('student', 'tutor')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (plan_id, user_id)
);

-- Indexes
create index if not exists plan_sessions_plan_day_idx
  on public.plan_sessions (plan_id, day_date);
create index if not exists plan_days_plan_date_idx
  on public.plan_days (plan_id, day_date);
create index if not exists extra_study_plan_day_idx
  on public.extra_study_logs (plan_id, day_date);
create index if not exists mock_scores_plan_logged_idx
  on public.mock_scores (plan_id, logged_date);
create index if not exists weekly_ref_plan_week_idx
  on public.weekly_reflections (plan_id, week_number);
create index if not exists plan_members_user_idx on public.plan_members (user_id);
create index if not exists plans_student_id_idx on public.plans (student_id);
create index if not exists plans_tutor_id_idx on public.plans (tutor_id);
create index if not exists plan_sessions_plan_day_id_idx
  on public.plan_sessions (plan_day_id);
create index if not exists mock_scores_session_id_idx on public.mock_scores (session_id);
create index if not exists session_completions_student_id_idx
  on public.session_completions (student_id);

-- Updated_at triggers
drop trigger if exists set_updated_at on public.plan_weeks;
create trigger set_updated_at before update on public.plan_weeks
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plan_days;
create trigger set_updated_at before update on public.plan_days
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plan_sessions;
create trigger set_updated_at before update on public.plan_sessions
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.extra_study_logs;
create trigger set_updated_at before update on public.extra_study_logs
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.weekly_reflections;
create trigger set_updated_at before update on public.weekly_reflections
  for each row execute function public.set_updated_at();

-- RLS enable
alter table public.plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_sessions enable row level security;
alter table public.session_completions enable row level security;
alter table public.extra_study_logs enable row level security;
alter table public.mock_scores enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.plan_members enable row level security;
alter table public.student_invite_links enable row level security;

-- RPC: invite consume
create or replace function public.student_invite_token_valid(p_token text)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.student_invite_links
    where token = p_token and redeemed_at is null
  );
$$;
grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

create or replace function public.consume_student_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_tutor uuid;
  v_student uuid := auth.uid();
begin
  if v_student is null then
    raise exception 'Must be authenticated';
  end if;
  update public.student_invite_links
  set
    redeemed_at = now(),
    redeemed_by_student_id = v_student
  where token = p_token and redeemed_at is null
  returning tutor_id into v_tutor;
  return v_tutor;
end;
$$;
grant execute on function public.consume_student_invite(text) to authenticated;

-- Policies (explicit subqueries avoid recursion patterns)
drop policy if exists "plans: public read" on public.plans;
create policy "plans: public read" on public.plans for select using (true);

drop policy if exists "plans: student insert" on public.plans;
create policy "plans: student insert" on public.plans
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "plans: student_or_tutor_update" on public.plans;
create policy "plans: student_or_tutor_update" on public.plans
  for update
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plans.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plans.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: select" on public.plan_weeks;
create policy "plan_weeks: select" on public.plan_weeks
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: insert" on public.plan_weeks;
create policy "plan_weeks: insert" on public.plan_weeks
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: update" on public.plan_weeks;
create policy "plan_weeks: update" on public.plan_weeks
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
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
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_weeks: delete" on public.plan_weeks;
create policy "plan_weeks: delete" on public.plan_weeks
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_weeks.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_weeks.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: select" on public.plan_days;
create policy "plan_days: select" on public.plan_days
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: insert" on public.plan_days;
create policy "plan_days: insert" on public.plan_days
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: update" on public.plan_days;
create policy "plan_days: update" on public.plan_days
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
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
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_days: delete" on public.plan_days;
create policy "plan_days: delete" on public.plan_days
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_days.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_days.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: select" on public.plan_sessions;
create policy "plan_sessions: select" on public.plan_sessions
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: insert" on public.plan_sessions;
create policy "plan_sessions: insert" on public.plan_sessions
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: update" on public.plan_sessions;
create policy "plan_sessions: update" on public.plan_sessions
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "plan_sessions: delete" on public.plan_sessions;
create policy "plan_sessions: delete" on public.plan_sessions
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.student_id = (select auth.uid())
    )
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = plan_sessions.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "extra_study: select" on public.extra_study_logs;
create policy "extra_study: select" on public.extra_study_logs
  for select using (student_id = (select auth.uid()));

drop policy if exists "extra_study: insert" on public.extra_study_logs;
create policy "extra_study: insert" on public.extra_study_logs
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "extra_study: update" on public.extra_study_logs;
create policy "extra_study: update" on public.extra_study_logs
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "extra_study: delete" on public.extra_study_logs;
create policy "extra_study: delete" on public.extra_study_logs
  for delete using (student_id = (select auth.uid()));

drop policy if exists "completions: select" on public.session_completions;
create policy "completions: select" on public.session_completions
  for select using (student_id = (select auth.uid()));

drop policy if exists "completions: insert" on public.session_completions;
create policy "completions: insert" on public.session_completions
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "completions: update" on public.session_completions;
create policy "completions: update" on public.session_completions
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "completions: delete" on public.session_completions;
create policy "completions: delete" on public.session_completions
  for delete using (student_id = (select auth.uid()));

drop policy if exists "mock_scores: select" on public.mock_scores;
create policy "mock_scores: select" on public.mock_scores
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = mock_scores.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "mock_scores: insert" on public.mock_scores;
create policy "mock_scores: insert" on public.mock_scores
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "mock_scores: update" on public.mock_scores;
create policy "mock_scores: update" on public.mock_scores
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "mock_scores: delete" on public.mock_scores;
create policy "mock_scores: delete" on public.mock_scores
  for delete using (student_id = (select auth.uid()));

drop policy if exists "reflections: select" on public.weekly_reflections;
create policy "reflections: select" on public.weekly_reflections
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = weekly_reflections.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "reflections: insert" on public.weekly_reflections;
create policy "reflections: insert" on public.weekly_reflections
  for insert with check (student_id = (select auth.uid()));

drop policy if exists "reflections: update" on public.weekly_reflections;
create policy "reflections: update" on public.weekly_reflections
  for update
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

drop policy if exists "reflections: delete" on public.weekly_reflections;
create policy "reflections: delete" on public.weekly_reflections
  for delete using (student_id = (select auth.uid()));

-- plan_members: non-recursive (join plans)
drop policy if exists "plan_members: select" on public.plan_members;
create policy "plan_members: select" on public.plan_members
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and (
          p.tutor_id = (select auth.uid())
          or p.student_id = (select auth.uid())
        )
    )
  );

drop policy if exists "plan_members: insert" on public.plan_members;
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
      select 1 from public.plans p
      where p.id = plan_members.plan_id
        and p.tutor_id = (select auth.uid())
        and plan_members.role = 'tutor'
    )
  );

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


-- ========== 025_mailchimp_webhook_config_enable_rls.sql ==========
-- Bullet 7 / advisor: public.mailchimp_webhook_config had RLS disabled (secrets readable via anon key).
-- Rows are only consumed inside SECURITY DEFINER public.trigger_mailchimp_on_signup(); the table owner
-- bypasses RLS, so the auth trigger keeps working. No client policies: anon/authenticated cannot SELECT.

alter table public.mailchimp_webhook_config enable row level security;

comment on table public.mailchimp_webhook_config is
  'Config for Mailchimp signup webhook: edge_function_url and webhook_secret. RLS on; no policies for API roles - reads only from trigger (definer/owner).';


-- ========== 026_revoke_anon_execute_admin_and_internal_rpcs.sql ==========
-- Advisor 0028: anon could EXECUTE SECURITY DEFINER RPCs exposed via PostgREST.
-- Admin RPCs already enforce profiles.role = 'admin' but should not be callable without a session.
-- student_invite_token_valid(text) stays callable for anon (unauthenticated /join/[token] page).
-- consume_student_invite: authenticated only (invite consumption after login / API with session).
-- trigger_mailchimp_on_signup: no API EXECUTE (auth trigger runs as function owner).
-- handle_auth_user_profiles_planner_sync: service_role only (same as 024_planner_unified_plan_sessions).

-- Admin dashboard RPCs: authenticated only
revoke execute on function public.get_admin_stats() from public, anon;
revoke execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) from public, anon;

revoke execute on function public.get_admin_registrations_overview(integer) from public, anon;

revoke execute on function public.consume_student_invite(text) from public, anon;

revoke execute on function public.trigger_mailchimp_on_signup() from public, anon, authenticated;

revoke execute on function public.handle_auth_user_profiles_planner_sync() from public, anon, authenticated;

grant execute on function public.get_admin_stats() to authenticated;
grant execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) to authenticated;
grant execute on function public.get_admin_registrations_overview(integer) to authenticated;
grant execute on function public.consume_student_invite(text) to authenticated;

grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;


-- ========== 027_planner_rls_bundle_05.sql ==========
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


-- ========== 028_planner_skill_repo_sync_marker.sql ==========
-- Remote alignment marker (applied as `planner_skill_repo_sync_marker_028`).
-- Planner DDL already present via `planner_skill_q1` … `planner_skill_rls_bundle_05`.
select 1;


-- ========== 029_fk_covering_indexes.sql ==========
-- Performance (Supabase advisor 0001): covering indexes for FK columns without an index.

create index if not exists bug_reports_user_id_fkey_cover_idx on public.bug_reports (user_id);
create index if not exists extra_study_logs_student_id_fkey_cover_idx on public.extra_study_logs (student_id);
create index if not exists mock_scores_student_id_fkey_cover_idx on public.mock_scores (student_id);
create index if not exists plan_days_plan_week_id_fkey_cover_idx on public.plan_days (plan_week_id);
create index if not exists question_feedback_user_id_fkey_cover_idx on public.question_feedback (user_id);
create index if not exists student_invite_links_redeemed_by_student_id_fkey_cover_idx
  on public.student_invite_links (redeemed_by_student_id);
create index if not exists weekly_reflections_student_id_fkey_cover_idx on public.weekly_reflections (student_id);


-- ========== 030_rls_auth_subquery_performance.sql ==========
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


-- ========== 031_tutor_linked_writes_rls.sql ==========
-- Align RLS with planner API: linked tutors (plan_members.role = tutor) may read/write
-- student-keyed rows for that plan when student_id matches plans.student_id.

-- ----- session_completions -----
drop policy if exists "completions: select" on public.session_completions;
create policy "completions: select" on public.session_completions
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.plan_sessions ps
      join public.plan_members pm on pm.plan_id = ps.plan_id
      where ps.id = session_completions.session_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "completions: insert" on public.session_completions;
create policy "completions: insert" on public.session_completions
  for insert with check (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "completions: update" on public.session_completions;
create policy "completions: update" on public.session_completions
  for update
  using (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "completions: delete" on public.session_completions;
create policy "completions: delete" on public.session_completions
  for delete using (
    exists (
      select 1
      from public.plan_sessions ps
      join public.plans p on p.id = ps.plan_id
      where ps.id = session_completions.session_id
        and session_completions.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- mock_scores -----
drop policy if exists "mock_scores: insert" on public.mock_scores;
create policy "mock_scores: insert" on public.mock_scores
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "mock_scores: update" on public.mock_scores;
create policy "mock_scores: update" on public.mock_scores
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "mock_scores: delete" on public.mock_scores;
create policy "mock_scores: delete" on public.mock_scores
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = mock_scores.plan_id
        and mock_scores.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- weekly_reflections -----
drop policy if exists "reflections: insert" on public.weekly_reflections;
create policy "reflections: insert" on public.weekly_reflections
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "reflections: update" on public.weekly_reflections;
create policy "reflections: update" on public.weekly_reflections
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "reflections: delete" on public.weekly_reflections;
create policy "reflections: delete" on public.weekly_reflections
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = weekly_reflections.plan_id
        and weekly_reflections.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

-- ----- extra_study_logs -----
drop policy if exists "extra_study: select" on public.extra_study_logs;
create policy "extra_study: select" on public.extra_study_logs
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = extra_study_logs.plan_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'tutor'
    )
  );

drop policy if exists "extra_study: insert" on public.extra_study_logs;
create policy "extra_study: insert" on public.extra_study_logs
  for insert with check (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "extra_study: update" on public.extra_study_logs;
create policy "extra_study: update" on public.extra_study_logs
  for update
  using (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );

drop policy if exists "extra_study: delete" on public.extra_study_logs;
create policy "extra_study: delete" on public.extra_study_logs
  for delete using (
    exists (
      select 1 from public.plans p
      where p.id = extra_study_logs.plan_id
        and extra_study_logs.student_id = p.student_id
        and (
          p.student_id = (select auth.uid())
          or exists (
            select 1 from public.plan_members pm
            where pm.plan_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.role = 'tutor'
          )
        )
    )
  );


-- ========== 032_plans_select_rls_student_or_tutor.sql ==========
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


-- ========== 033_mailchimp_trigger_warn_when_unconfigured.sql ==========
-- Surface misconfiguration in Postgres logs instead of failing silently.

create or replace function public.trigger_mailchimp_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_url text;
  secret text;
  req_body jsonb;
  request_id bigint;
begin
  select value into edge_url from public.mailchimp_webhook_config where key = 'edge_function_url';
  select value into secret from public.mailchimp_webhook_config where key = 'webhook_secret';

  if edge_url is null or trim(edge_url) = '' or edge_url like '%REPLACE_WITH%' then
    raise warning 'Mailchimp signup sync skipped: edge_function_url not configured (table public.mailchimp_webhook_config)';
    return new;
  end if;
  if secret is null or trim(secret) = '' or secret like '%REPLACE_WITH%' then
    raise warning 'Mailchimp signup sync skipped: webhook_secret not configured (table public.mailchimp_webhook_config)';
    return new;
  end if;

  req_body := jsonb_build_object(
    'secret', secret,
    'record', jsonb_build_object(
      'email', new.email,
      'raw_user_meta_data', coalesce(new.raw_user_meta_data, '{}'::jsonb)
    )
  );

  request_id := net.http_post(
    url := edge_url,
    body := req_body,
    params := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;


-- ========== 034_sjt_questions.sql ==========
-- SJT question bank: server-side only (no direct SELECT for anon/authenticated).
-- Clients fetch one scenario at a time via get_random_sjt_question.

create table if not exists public.sjt_questions (
  id text primary key,
  type text not null check (type in ('appropriateness', 'importance', 'ranking')),
  domain text not null,
  difficulty text not null check (difficulty in ('foundation', 'standard', 'challenging')),
  stem text not null,
  pivot_insight text,
  gmp_ref jsonb,
  items jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.sjt_questions is 'UCAT SJT trainer scenarios; read only via get_random_sjt_question RPC.';

create index if not exists sjt_questions_type_idx on public.sjt_questions (type);

alter table public.sjt_questions enable row level security;

-- No SELECT/INSERT/UPDATE policies for anon or authenticated (service role seeds only).

create or replace function public.get_random_sjt_question(
  p_type text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_rec public.sjt_questions%rowtype;
begin
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type';
  end if;

  select * into row_rec
  from public.sjt_questions q
  where q.type = p_type
    and not (q.id = any (coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', row_rec.id,
    'type', row_rec.type,
    'domain', row_rec.domain,
    'difficulty', row_rec.difficulty,
    'stem', row_rec.stem,
    'pivotInsight', row_rec.pivot_insight,
    'gmpRef', row_rec.gmp_ref,
    'items', row_rec.items
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random SJT scenario as JSON (camelCase). Callable by anon for free trainers.';

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;


-- ========== 035_lock_syllogism_questions.sql ==========
-- Lock syllogism_questions: revoke public table read; serve drills via RPC only.

drop policy if exists "Allow public read access to syllogism questions" on public.syllogism_questions;

create or replace function public.get_syllogism_micro_batch(p_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

comment on function public.get_syllogism_micro_batch(integer) is
  'Returns up to 50 random syllogism questions for micro drill. Callable by anon.';

create or replace function public.get_syllogism_macro_block(p_exclude_block_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_block uuid;
  result jsonb;
begin
  select sq.macro_block_id into chosen_block
  from public.syllogism_questions sq
  where sq.macro_block_id is not null
    and not (sq.macro_block_id = any (coalesce(p_exclude_block_ids, '{}')))
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from public.syllogism_questions q
  where q.macro_block_id = chosen_block;

  return result;
end;
$$;

comment on function public.get_syllogism_macro_block(uuid[]) is
  'Returns one random macro block (5 conclusions per stimulus). Callable by anon.';

grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;


-- ========== 036_harden_profile_roles_memberships_public_writes.sql ==========
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


-- ========== 037_sjt_sessions.sql ==========
-- SJT skills trainer session history (per scenario, completed or partial).

create table if not exists public.sjt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  question_type text not null check (question_type in ('appropriateness', 'importance', 'ranking')),
  domain text not null,
  score numeric not null check (score >= 0),
  max_score numeric not null check (max_score > 0),
  items_attempted integer not null check (items_attempted >= 0),
  items_total integer not null check (items_total > 0),
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.sjt_sessions is 'User SJT drill attempts: one row per scenario completion or partial abandon.';

create index if not exists sjt_sessions_user_id_created_at_idx
  on public.sjt_sessions (user_id, created_at desc);

alter table public.sjt_sessions enable row level security;

create policy "Users can insert their own sjt sessions"
  on public.sjt_sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own sjt sessions"
  on public.sjt_sessions for select
  using ((select auth.uid()) = user_id);


-- ========== 038_fix_plans_rls_recursion.sql ==========
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


-- ========== 039_fix_plans_insert_select_rls.sql ==========
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


-- ========== 040_fix_sjt_item_codes.sql ==========
-- Remove internal item ID codes leaked into whyNotAdjacent explanation text.

update public.sjt_questions
set items = (
  select jsonb_agg(
    case
      when item->>'id' = 'app-003-a' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent', 'declining (app-003-b)', 'declining the gift'))
      when item->>'id' = 'app-018-c' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent', 'disclosing limits and seeking supervision (app-018-a)', 'disclosing her limits and seeking supervision'))
      when item->>'id' = 'app-021-a' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent',
            'respecting a capacitous patient''s wish to delay, once risks are understood (app-021-c)',
            'respecting a capacitous patient''s wish to delay once risks are understood'))
      else item
    end
  )
  from jsonb_array_elements(items) as item
)
where id in ('app-003', 'app-018', 'app-021');


-- ========== 041_ucat_exam_date_rpc.sql ==========
-- Provide a security-definer RPC so authenticated users can update their own
-- ucat_exam_date without needing table-level INSERT/UPDATE on profiles.
-- This sidesteps PostgREST column-level-grant limitations introduced in 036.

create or replace function public.set_ucat_exam_date(p_exam_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only update the calling user's own row.
  update public.profiles
  set
    ucat_exam_date = p_exam_date,
    updated_at     = now()
  where id = (select auth.uid());

  -- If no row exists yet, create a minimal one.
  if not found then
    insert into public.profiles (id, ucat_exam_date, updated_at)
    values ((select auth.uid()), p_exam_date, now())
    on conflict (id) do update
      set ucat_exam_date = excluded.ucat_exam_date,
          updated_at     = excluded.updated_at;
  end if;
end;
$$;

-- Only authenticated users may call this; anon cannot.
revoke execute on function public.set_ucat_exam_date(date) from public, anon;
grant  execute on function public.set_ucat_exam_date(date) to authenticated;


-- ========== 042_dm_trainer_questions_and_sessions.sql ==========
-- DM skills trainers: Venn Logic, Data Logic, Argument Judge
-- Questions are seeded via scripts/seedDmTrainerQuestions.ts (service role).
-- Clients read drills via get_dm_trainer_drill RPC only.

create table if not exists public.dm_trainer_questions (
  id text primary key,
  trainer_type text not null check (trainer_type in ('venn-logic', 'data-logic', 'argument-judge')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  sort_order integer not null check (sort_order >= 0),
  stem text not null,
  question text not null,
  options jsonb not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text not null,
  skill_tag text not null,
  common_trap text not null,
  optional_working_steps jsonb,
  review jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (trainer_type, sort_order)
);

comment on table public.dm_trainer_questions is
  'UCAT Decision Making skills trainer questions (Venn, data, argument). Read via get_dm_trainer_drill.';

create index if not exists dm_trainer_questions_type_active_idx
  on public.dm_trainer_questions (trainer_type, sort_order)
  where is_active = true;

alter table public.dm_trainer_questions enable row level security;

-- No direct SELECT for anon/authenticated (service role seeds only).

create table if not exists public.dm_trainer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trainer_type text not null check (trainer_type in ('venn-logic', 'data-logic', 'argument-judge')),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  retry_mode boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.dm_trainer_sessions is
  'User DM skills trainer drill completions (5-question runs and retries).';

create index if not exists dm_trainer_sessions_user_type_created_idx
  on public.dm_trainer_sessions (user_id, trainer_type, created_at desc);

alter table public.dm_trainer_sessions enable row level security;

create policy "Users can insert their own dm trainer sessions"
  on public.dm_trainer_sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own dm trainer sessions"
  on public.dm_trainer_sessions for select
  using ((select auth.uid()) = user_id);

create or replace function public.get_dm_trainer_drill(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_trainer_type is null or p_trainer_type not in ('venn-logic', 'data-logic', 'argument-judge') then
    raise exception 'Invalid trainer type';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'trainerType', q.trainer_type,
        'difficulty', q.difficulty,
        'stem', q.stem,
        'question', q.question,
        'options', q.options,
        'correctAnswer', q.correct_answer,
        'explanation', q.explanation,
        'skillTag', q.skill_tag,
        'commonTrap', q.common_trap,
        'optionalWorkingSteps', q.optional_working_steps,
        'review', q.review
      )
      order by q.sort_order
    ),
    '[]'::jsonb
  )
  into result
  from public.dm_trainer_questions q
  where q.trainer_type = p_trainer_type
    and q.is_active = true;

  return result;
end;
$$;

comment on function public.get_dm_trainer_drill(text) is
  'Returns ordered DM skills trainer questions as JSON array (camelCase). Callable by anon.';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;


-- ========== 043_sessions_add_unit_conversions_type.sql ==========
-- Extend sessions.training_type to support the QR Unit Conversions trainer.

alter table public.sessions drop constraint if exists sessions_training_type_check;

alter table public.sessions add constraint sessions_training_type_check
  check (
    training_type in (
      'speed_reading',
      'rapid_recall',
      'keyword_scanning',
      'calculator',
      'inference_trainer',
      'mental_maths',
      'unit_conversions'
    )
  );


-- ========== 20260518165743_question_media_support.sql ==========
-- Universal question media support.
-- Media files live in Supabase Storage bucket "question-media"; question rows store
-- portable JSON metadata and storage paths/URLs in media jsonb.

alter table public.sjt_questions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.syllogism_questions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.sjt_questions
  drop constraint if exists sjt_questions_media_is_array;

alter table public.sjt_questions
  add constraint sjt_questions_media_is_array
  check (jsonb_typeof(media) = 'array');

alter table public.syllogism_questions
  drop constraint if exists syllogism_questions_media_is_array;

alter table public.syllogism_questions
  add constraint syllogism_questions_media_is_array
  check (jsonb_typeof(media) = 'array');

comment on column public.sjt_questions.media is
  'Optional array of question media objects. Image src values may be full URLs, root-relative paths, or paths inside the question-media Storage bucket.';

comment on column public.syllogism_questions.media is
  'Optional array of question media objects for the stimulus/conclusion. Macro blocks should repeat shared stimulus media on each row in the block.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-media',
  'question-media',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Question media images are publicly readable" on storage.objects;
create policy "Question media images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'question-media');

drop policy if exists "Admins can upload question media" on storage.objects;
create policy "Admins can upload question media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can update question media" on storage.objects;
create policy "Admins can update question media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete question media" on storage.objects;
create policy "Admins can delete question media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create or replace function public.get_random_sjt_question(
  p_type text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_rec public.sjt_questions%rowtype;
begin
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type';
  end if;

  select * into row_rec
  from public.sjt_questions q
  where q.type = p_type
    and not (q.id = any (coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', row_rec.id,
    'type', row_rec.type,
    'domain', row_rec.domain,
    'difficulty', row_rec.difficulty,
    'stem', row_rec.stem,
    'media', coalesce(row_rec.media, '[]'::jsonb),
    'pivotInsight', row_rec.pivot_insight,
    'gmpRef', row_rec.gmp_ref,
    'items', row_rec.items
  );
end;
$$;

create or replace function public.get_syllogism_micro_batch(p_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

create or replace function public.get_syllogism_macro_block(p_exclude_block_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_block uuid;
  result jsonb;
begin
  select sq.macro_block_id into chosen_block
  from public.syllogism_questions sq
  where sq.macro_block_id is not null
    and not (sq.macro_block_id = any (coalesce(p_exclude_block_ids, '{}')))
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from public.syllogism_questions q
  where q.macro_block_id = chosen_block;

  return result;
end;
$$;

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;


-- ========== 20260518170624_tighten_question_media_storage_policy.sql ==========
-- Public buckets can serve object URLs without a broad SELECT policy.
-- Dropping this policy prevents clients from listing every object in the bucket.

drop policy if exists "Question media images are publicly readable" on storage.objects;


-- ========== 20260519133000_syllogism_foundations.sql ==========
alter table public.syllogism_questions
  add column if not exists question_mode text,
  add column if not exists rule_name text,
  add column if not exists key_takeaway text;

with block_sizes as (
  select macro_block_id, count(*) as question_count
  from public.syllogism_questions
  where macro_block_id is not null
  group by macro_block_id
)
update public.syllogism_questions q
set question_mode = case
  when bs.question_count = 5 then 'macro'
  else 'micro'
end
from block_sizes bs
where q.macro_block_id = bs.macro_block_id
  and q.question_mode is null;

update public.syllogism_questions
set question_mode = 'micro'
where question_mode is null;

alter table public.syllogism_questions
  alter column question_mode set default 'micro',
  alter column question_mode set not null;

alter table public.syllogism_questions
  drop constraint if exists syllogism_questions_question_mode_check;

alter table public.syllogism_questions
  add constraint syllogism_questions_question_mode_check
  check (question_mode in ('foundation', 'micro', 'macro'));

alter table public.syllogism_sessions
  drop constraint if exists syllogism_sessions_mode_check;

alter table public.syllogism_sessions
  add constraint syllogism_sessions_mode_check
  check (mode in ('foundation', 'micro', 'macro'));

delete from public.syllogism_questions
where question_mode = 'foundation'
  and trick_type like 'foundation_%';

insert into public.syllogism_questions (
  macro_block_id,
  question_mode,
  stimulus_text,
  conclusion_text,
  is_correct,
  logic_group,
  trick_type,
  explanation,
  rule_name,
  key_takeaway
) values
  (
    null,
    'foundation',
    'No elective modules are weekend sessions.',
    'If something is an elective module, it cannot be a weekend session.',
    true,
    'categorical',
    'foundation_no_forward',
    'The premise says the two groups do not overlap at all. Anything inside the elective-module group must therefore be outside the weekend-session group.',
    'No means no overlap',
    'No A are B guarantees that an A cannot be B.'
  ),
  (
    null,
    'foundation',
    'No archive records are live requests.',
    'If something is a live request, it cannot be an archive record.',
    true,
    'categorical',
    'foundation_no_reverse',
    'No-overlap statements work both ways. If no archive records are live requests, then no live requests can be archive records either.',
    'No is reversible',
    'No A are B also guarantees that no B are A.'
  ),
  (
    null,
    'foundation',
    'No ceramic samples are digital files.',
    'Some ceramic samples are digital files.',
    false,
    'categorical',
    'foundation_no_blocks_some',
    'The premise rules out every possible overlap between ceramic samples and digital files, so even one overlap would contradict it.',
    'No blocks some',
    'No A are B means you cannot also conclude that some A are B.'
  ),
  (
    null,
    'foundation',
    'All blue badges are verified passes.',
    'If something is a blue badge, it is a verified pass.',
    true,
    'categorical',
    'foundation_all_forward',
    'All tells you that the whole blue-badge group sits inside the verified-pass group. A blue badge must therefore be a verified pass.',
    'All travels forwards',
    'All A are B guarantees that any A is B.'
  ),
  (
    null,
    'foundation',
    'All theatre scripts are draft documents.',
    'Every draft document is a theatre script.',
    false,
    'categorical',
    'foundation_all_converse_trap',
    'The premise puts theatre scripts inside draft documents. It does not say the draft-document group contains only theatre scripts.',
    'All is not reversible',
    'All A are B does not prove that all B are A.'
  ),
  (
    null,
    'foundation',
    'All safety briefings are scheduled meetings.',
    'It is possible that every scheduled meeting is a safety briefing.',
    true,
    'categorical',
    'foundation_all_allows_equal_groups',
    'The premise only says safety briefings are within scheduled meetings. It does not rule out the two groups being exactly the same size.',
    'All allows equality',
    'All A are B allows, but does not require, all B to be A.'
  ),
  (
    null,
    'foundation',
    'All river surveys are field reports.',
    'Some river surveys are not field reports.',
    false,
    'categorical',
    'foundation_all_blocks_some_not',
    'If every river survey is a field report, there cannot be even one river survey outside the field-report group.',
    'All excludes exceptions',
    'All A are B means no A can be outside B.'
  ),
  (
    null,
    'foundation',
    'Some library cards are temporary permits.',
    'At least one temporary permit is a library card.',
    true,
    'relative',
    'foundation_some_reverse',
    'Some means there is at least one item in the overlap. That same overlapping item is both a library card and a temporary permit.',
    'Some is reversible',
    'Some A are B guarantees that some B are A.'
  ),
  (
    null,
    'foundation',
    'Some trial shifts are morning shifts.',
    'All trial shifts are morning shifts.',
    false,
    'relative',
    'foundation_some_not_all',
    'Some only proves at least one overlap. It gives no guarantee about every trial shift.',
    'Some is not all',
    'Some A are B does not prove that all A are B.'
  ),
  (
    null,
    'foundation',
    'Some mural sketches are approved designs.',
    'It is possible that some mural sketches are not approved designs.',
    true,
    'relative',
    'foundation_some_allows_some_not',
    'The premise confirms at least one mural sketch is approved. It does not rule out other mural sketches being unapproved.',
    'Some leaves room',
    'Some A are B allows the possibility that some A are not B.'
  ),
  (
    null,
    'foundation',
    'Some orchard maps are laminated sheets.',
    'No orchard maps are laminated sheets.',
    false,
    'relative',
    'foundation_some_contradicts_no',
    'The premise says there is at least one overlap, while the conclusion says there is no overlap. Both cannot be true.',
    'Some defeats no',
    'Some A are B means it is false that no A are B.'
  ),
  (
    null,
    'foundation',
    'Some coding workshops are evening classes.',
    'At least one coding workshop is an evening class.',
    true,
    'relative',
    'foundation_some_at_least_one',
    'In UCAT syllogisms, some means at least one. This conclusion simply restates that minimum overlap.',
    'Some means at least one',
    'Some A are B guarantees at least one A that is B.'
  ),
  (
    null,
    'foundation',
    'Most practice sets are timed tasks.',
    'Some practice sets are timed tasks.',
    true,
    'majority',
    'foundation_most_implies_some',
    'Most means more than half. If more than half of the practice sets are timed tasks, at least one practice set must be a timed task.',
    'Most includes some',
    'Most A are B guarantees that some A are B.'
  ),
  (
    null,
    'foundation',
    'Most consent forms are scanned records.',
    'Most scanned records are consent forms.',
    false,
    'majority',
    'foundation_most_converse_trap',
    'The majority claim is about consent forms, not scanned records. The scanned-record group could be much larger.',
    'Most is not reversible',
    'Most A are B does not prove that most B are A.'
  ),
  (
    null,
    'foundation',
    'Most campus tours are guided visits.',
    'All campus tours are guided visits.',
    false,
    'majority',
    'foundation_most_not_all',
    'Most is still weaker than all. It allows there to be campus tours that are not guided visits.',
    'Most is not all',
    'Most A are B does not prove that all A are B.'
  ),
  (
    null,
    'foundation',
    'Most rehearsal rooms are booked spaces.',
    'Some booked spaces are rehearsal rooms.',
    true,
    'majority',
    'foundation_most_some_reverse',
    'Most rehearsal rooms being booked spaces guarantees at least one overlap, and any overlapping item can be described in either direction.',
    'Most creates reversible overlap',
    'Most A are B guarantees that some B are A.'
  ),
  (
    null,
    'foundation',
    'All pilot interviews are recorded sessions. No recorded sessions are informal chats.',
    'No pilot interviews are informal chats.',
    true,
    'complex',
    'foundation_all_no_chain',
    'Pilot interviews sit inside recorded sessions, and recorded sessions have no overlap with informal chats. So pilot interviews cannot overlap with informal chats.',
    'All plus no can chain',
    'If all A are B and no B are C, then no A are C.'
  ),
  (
    null,
    'foundation',
    'All bronze tokens are member passes. Some member passes are weekend tickets.',
    'Some bronze tokens are weekend tickets.',
    false,
    'complex',
    'foundation_all_some_weak_chain',
    'The weekend-ticket overlap may involve member passes that are not bronze tokens. The premises do not force any bronze token to be a weekend ticket.',
    'Some breaks the chain',
    'All A are B plus some B are C does not prove that some A are C.'
  ),
  (
    null,
    'foundation',
    'No winter clinics are drop-in appointments. All emergency slots are drop-in appointments.',
    'No emergency slots are winter clinics.',
    true,
    'complex',
    'foundation_no_all_exclusion',
    'Emergency slots are inside the drop-in group, and winter clinics are completely outside that group. So emergency slots cannot be winter clinics.',
    'Exclusion transfers through all',
    'If no A are B and all C are B, then no C are A.'
  ),
  (
    null,
    'foundation',
    'All evening seminars are ticketed events. No ticketed events are walk-in activities.',
    'Some evening seminars are walk-in activities.',
    false,
    'complex',
    'foundation_all_no_blocks_some',
    'Every evening seminar is ticketed, and ticketed events cannot be walk-in activities. The proposed overlap is impossible.',
    'A no-link blocks overlap',
    'If all A are B and no B are C, then some A are C cannot follow.'
  ),
  (
    null,
    'foundation',
    'If a parcel is priority mail, then it is tracked. This parcel is priority mail.',
    'This parcel is tracked.',
    true,
    'complex',
    'foundation_conditional_forward',
    'The condition is met: the parcel is priority mail. The result in the rule must therefore apply.',
    'Conditional forward step',
    'If A then B, and A is true, B must be true.'
  ),
  (
    null,
    'foundation',
    'If a badge is expired, then it is invalid. This badge is invalid.',
    'This badge is expired.',
    false,
    'complex',
    'foundation_conditional_affirming_consequent',
    'The rule says expired badges are invalid, but it does not say invalid badges are only expired. There could be another reason for invalidity.',
    'Do not reverse if-then',
    'If A then B does not prove that B means A.'
  ),
  (
    null,
    'foundation',
    'If a room is sterile, then it is sealed. This room is not sealed.',
    'This room is not sterile.',
    true,
    'complex',
    'foundation_conditional_contrapositive',
    'A sterile room would have to be sealed. Since this room is not sealed, it cannot be sterile.',
    'Contrapositive works',
    'If A then B, and B is false, A must be false.'
  ),
  (
    null,
    'foundation',
    'If a voucher is digital, then it has a code. This voucher is not digital.',
    'This voucher does not have a code.',
    false,
    'complex',
    'foundation_conditional_denying_antecedent',
    'Digital vouchers must have codes, but non-digital vouchers might also have codes. The rule does not tell us either way.',
    'Do not deny the first part',
    'If A then B, and A is false, B could still be true.'
  ),
  (
    null,
    'foundation',
    'Every research applicant has at least one of a portfolio or a transcript.',
    'A research applicant can have neither a portfolio nor a transcript.',
    false,
    'complex',
    'foundation_either_or_not_neither',
    'Having at least one of the two options rules out having neither. Each applicant must have a portfolio, a transcript, or both.',
    'At least one rules out neither',
    'If every A has B or C, an A cannot have neither.'
  ),
  (
    null,
    'foundation',
    'Every field kit contains at least one of a compass or a torch. This field kit does not contain a compass.',
    'This field kit contains a torch.',
    true,
    'complex',
    'foundation_either_or_elimination',
    'The kit must contain at least one of the two items. Once compass is ruled out, torch is the only remaining way to satisfy the premise.',
    'Eliminate one option',
    'If A must have B or C, and not B, then A must have C.'
  ),
  (
    null,
    'foundation',
    'Every gallery ticket is either a day ticket or a member ticket.',
    'All gallery tickets are day tickets.',
    false,
    'complex',
    'foundation_either_or_no_specific_option',
    'The premise guarantees each gallery ticket has one of the listed classifications. It does not choose day ticket for every gallery ticket.',
    'Either/or does not pick a side',
    'A or B does not by itself prove A.'
  );

create or replace function public.get_syllogism_foundation_batch(p_count integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 12), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    where sq.question_mode = 'foundation'
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

create or replace function public.get_syllogism_micro_batch(p_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    where sq.question_mode = 'micro'
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

create or replace function public.get_syllogism_macro_block(p_exclude_block_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_block uuid;
  result jsonb;
begin
  select sq.macro_block_id into chosen_block
  from public.syllogism_questions sq
  where sq.question_mode = 'macro'
    and sq.macro_block_id is not null
    and not (sq.macro_block_id = any (coalesce(p_exclude_block_ids, '{}')))
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from public.syllogism_questions q
  where q.question_mode = 'macro'
    and q.macro_block_id = chosen_block;

  return result;
end;
$$;

grant execute on function public.get_syllogism_foundation_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;


-- ========== 20260519160000_syllogism_foundations_batch2.sql ==========
-- 20 additional foundation syllogism questions (batch 2).
-- Idempotent: deletes any rows seeded by this script before re-inserting.

delete from public.syllogism_questions
where question_mode = 'foundation'
  and trick_type in (
    'foundation_some_not_no_reverse',
    'foundation_some_not_allows_some',
    'foundation_some_not_is_not_no',
    'foundation_all_all_chain',
    'foundation_all_all_chain_converse_trap',
    'foundation_no_some_chain',
    'foundation_some_some_weak_chain',
    'foundation_conditional_hypothetical_syllogism',
    'foundation_conditional_not_then_contrapositive',
    'foundation_conditional_shared_antecedent_trap',
    'foundation_all_no_some_not',
    'foundation_most_all_some_reverse',
    'foundation_no_no_no_trap',
    'foundation_some_all_some_chain',
    'foundation_all_some_not_no_chain',
    'foundation_most_no_most_not',
    'foundation_most_most_not_guaranteed',
    'foundation_most_allows_all',
    'foundation_inclusive_or_allows_both',
    'foundation_inclusive_or_not_exclusive'
  );

insert into public.syllogism_questions (
  macro_block_id,
  question_mode,
  stimulus_text,
  conclusion_text,
  is_correct,
  logic_group,
  trick_type,
  explanation,
  rule_name,
  key_takeaway
) values

  -- ── "Some are not" quantifier (3) ──────────────────────────────────────────

  (
    null,
    'foundation',
    'Some laboratory assistants are not qualified supervisors.',
    'Some qualified supervisors are not laboratory assistants.',
    false,
    'relative',
    'foundation_some_not_no_reverse',
    'The premise only tells us that a portion of laboratory assistants fall outside the qualified-supervisor group. It says nothing about the composition of the qualified-supervisor group itself; there could be qualified supervisors who are also laboratory assistants.',
    '"Some are not" does not reverse',
    'Some A are not B does not prove that some B are not A.'
  ),

  (
    null,
    'foundation',
    'Some research volunteers are not paid participants.',
    'It is possible that some research volunteers are paid participants.',
    true,
    'relative',
    'foundation_some_not_allows_some',
    'The premise confirms that a portion of volunteers are unpaid. It says nothing about the remaining volunteers, so others could well be paid participants.',
    '"Some are not" leaves the rest open',
    'Some A are not B allows, but does not prove, that some A are B.'
  ),

  (
    null,
    'foundation',
    'Some overnight shifts are not senior-staffed.',
    'No overnight shifts are senior-staffed.',
    false,
    'relative',
    'foundation_some_not_is_not_no',
    'The premise tells us only that some overnight shifts lack senior staff. It leaves open the possibility that other overnight shifts are senior-staffed; it does not eliminate all such cases.',
    '"Some are not" is not "none are"',
    'Some A are not B does not prove that no A are B.'
  ),

  -- ── Transitive chains (2) ──────────────────────────────────────────────────

  (
    null,
    'foundation',
    'All student volunteers are registered members. All registered members are insured participants.',
    'All student volunteers are insured participants.',
    true,
    'complex',
    'foundation_all_all_chain',
    'Student volunteers sit entirely inside the registered-member group, which sits entirely inside the insured-participant group. Following the chain, every student volunteer must be an insured participant.',
    'All plus all chains forward',
    'If all A are B and all B are C, then all A are C.'
  ),

  (
    null,
    'foundation',
    'All junior analysts are salaried employees. All salaried employees are payroll-registered staff.',
    'All payroll-registered staff are junior analysts.',
    false,
    'complex',
    'foundation_all_all_chain_converse_trap',
    'The chain places junior analysts inside salaried employees, which sit inside payroll-registered staff. Payroll-registered staff is the outermost group and almost certainly contains many people who are not junior analysts.',
    'A chain does not reverse',
    'All A are B and all B are C does not prove that all C are A.'
  ),

  -- ── No + Some chain (1) ────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'No completed forms are rejected submissions. Some intake files are completed forms.',
    'Some intake files are not rejected submissions.',
    true,
    'complex',
    'foundation_no_some_chain',
    'The intake files that are completed forms cannot be rejected submissions, because the first premise rules out any overlap between completed forms and rejected submissions. Those intake files are therefore guaranteed to sit outside the rejected-submission group.',
    'No plus some creates some-not',
    'If no A are B and some C are A, then some C are not B.'
  ),

  -- ── Some + Some weak chain (1) ────────────────────────────────────────────

  (
    null,
    'foundation',
    'Some duty rosters are colour-coded charts. Some colour-coded charts are digital dashboards.',
    'Some duty rosters are digital dashboards.',
    false,
    'complex',
    'foundation_some_some_weak_chain',
    'The colour-coded charts that are digital dashboards may be entirely different items from those that are duty rosters. The two "some" statements can describe non-overlapping subsets of colour-coded charts, so no duty roster need be a digital dashboard.',
    'Some plus some breaks the chain',
    'Some A are B and some B are C does not prove that some A are C.'
  ),

  -- ── Conditional rules (3) ─────────────────────────────────────────────────

  (
    null,
    'foundation',
    'If a submission is late, then it is flagged for review. If a submission is flagged for review, then it requires supervisor approval.',
    'If a submission is late, it requires supervisor approval.',
    true,
    'complex',
    'foundation_conditional_hypothetical_syllogism',
    'The two rules form an unbroken if-then chain: being late leads to being flagged, and being flagged leads to requiring supervisor approval. Following the chain from the first condition to the final result is valid.',
    'If-then chains link forward',
    'If A then B, and if B then C, then if A then C.'
  ),

  (
    null,
    'foundation',
    'If an application is not shortlisted, it is archived. This application is not archived.',
    'This application was shortlisted.',
    true,
    'complex',
    'foundation_conditional_not_then_contrapositive',
    'Taking the contrapositive of the rule: if not archived, then shortlisted. This application is not archived, so the contrapositive fires directly and the application must be shortlisted.',
    'Contrapositive of a negated-antecedent rule',
    'If not A then B, and B is false, then A must be true.'
  ),

  (
    null,
    'foundation',
    'If a patient is admitted, their records are updated. If a patient is admitted, a bed is assigned.',
    'If a patient''s records are updated, a bed is assigned.',
    false,
    'complex',
    'foundation_conditional_shared_antecedent_trap',
    'Both consequences share the same cause, but neither causes the other. Records being updated does not itself trigger bed assignment; only admission does. The two effects are independent results of admission.',
    'Shared cause does not link effects',
    'If A then B, and if A then C, does not prove that if B then C.'
  ),

  -- ── Mixed-quantifier chains (4) ───────────────────────────────────────────

  (
    null,
    'foundation',
    'All audit reports are board documents. No audit reports are confidential files.',
    'Some board documents are not confidential files.',
    true,
    'complex',
    'foundation_all_no_some_not',
    'The audit reports are all board documents and none are confidential files. The board documents that are audit reports must therefore sit outside the confidential-file group, giving at least one board document that is not confidential.',
    'All plus no produces some-not',
    'If all A are B and no A are C, then some B are not C.'
  ),

  (
    null,
    'foundation',
    'Some mentor sessions are recorded. All mentor sessions are scheduled appointments.',
    'Some scheduled appointments are recorded.',
    true,
    'complex',
    'foundation_some_all_some_chain',
    'The mentor sessions that are recorded are also, by the second premise, scheduled appointments. That gives at least one scheduled appointment which is recorded.',
    'Some plus all produces overlap',
    'If some A are B and all A are C, then some C are B.'
  ),

  (
    null,
    'foundation',
    'All archive boxes are labelled containers. Some labelled containers are not accessible to visitors.',
    'Some archive boxes are not accessible to visitors.',
    false,
    'complex',
    'foundation_all_some_not_no_chain',
    'The labelled containers that are inaccessible may be entirely outside the archive-box group. Because labelled containers can be a larger set than archive boxes, the restricted items need not include any archive box at all.',
    'A in B does not inherit B''s exceptions',
    'All A are B and some B are not C does not prove that some A are not C.'
  ),

  (
    null,
    'foundation',
    'No induction days are assessed events. No assessed events are social activities.',
    'No induction days are social activities.',
    false,
    'categorical',
    'foundation_no_no_no_trap',
    'The two premises share no information about whether induction days and social activities overlap. The middle term, assessed events, sits between them but establishes no link between induction days and social activities.',
    'No plus no does not chain',
    'No A are B and no B are C does not prove that no A are C.'
  ),

  -- ── Most extended (4) ─────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'Most apprentices are shift workers. All apprentices are registered trainees.',
    'Some registered trainees are shift workers.',
    true,
    'majority',
    'foundation_most_all_some_reverse',
    'The apprentices who are shift workers are also registered trainees (by the second premise). That overlap guarantees at least one registered trainee who is a shift worker.',
    'Most plus all produces some overlap',
    'If most A are B and all A are C, then some C are B.'
  ),

  (
    null,
    'foundation',
    'Most council reports are public records. No public records are restricted documents.',
    'Most council reports are not restricted documents.',
    true,
    'majority',
    'foundation_most_no_most_not',
    'The majority of council reports are public records, and no public record can be a restricted document. That majority portion of council reports is therefore guaranteed to sit outside the restricted-document group, making it true that most council reports are not restricted documents.',
    'Most in a no-zone means most excluded',
    'If most A are B and no B are C, then most A are not C.'
  ),

  (
    null,
    'foundation',
    'Most planning applications are reviewed documents. Most reviewed documents are archived files.',
    'Most planning applications are archived files.',
    false,
    'majority',
    'foundation_most_most_not_guaranteed',
    'If each majority is just above 50%, the planning applications that are reviewed documents and the reviewed documents that are archived files need not be the same items. The combined overlap reaching planning applications could fall below 50%, so most planning applications being archived files is not guaranteed.',
    'Most plus most is not most',
    'Most A are B and most B are C does not guarantee that most A are C.'
  ),

  (
    null,
    'foundation',
    'Most conference papers are peer-reviewed.',
    'It is possible that all conference papers are peer-reviewed.',
    true,
    'majority',
    'foundation_most_allows_all',
    'Most means more than half. It does not rule out every single paper being peer-reviewed; that scenario is entirely consistent with the premise.',
    'Most allows all',
    'Most A are B is compatible with all A being B.'
  ),

  -- ── Inclusive or (2) ──────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'Every project proposal must contain either a budget summary or a timeline, or both.',
    'A project proposal that contains a budget summary can also contain a timeline.',
    true,
    'complex',
    'foundation_inclusive_or_allows_both',
    'The phrase "or both" explicitly makes this an inclusive or. Having both options simultaneously satisfies the premise and is therefore possible.',
    'Inclusive or permits both',
    'A or B (inclusive) means having both is allowed.'
  ),

  (
    null,
    'foundation',
    'Every team meeting is either recorded or minuted, or possibly both.',
    'A team meeting that is recorded cannot also be minuted.',
    false,
    'complex',
    'foundation_inclusive_or_not_exclusive',
    'The premise uses an inclusive or. A meeting can satisfy the condition by being recorded, by being minuted, or by being both. Being recorded does not exclude also being minuted.',
    'Inclusive or is not exclusive',
    'If A or B (inclusive), then A being true does not force B to be false.'
  );


-- ========== 20260519161000_syllogism_foundations_fix_explanations.sql ==========
-- Fix 5 foundation question explanations that were unclear or used jargon.

update public.syllogism_questions
set explanation = 'The premise puts safety briefings inside scheduled meetings. It says nothing about scheduled meetings that are not safety briefings — there might be none at all, meaning the two groups could be identical.'
where trick_type = 'foundation_all_allows_equal_groups';

update public.syllogism_questions
set explanation = 'Most rehearsal rooms are booked spaces, so at least one rehearsal room is also a booked space. That same item can be described from either side: it is a booked space that is a rehearsal room, which is exactly what the conclusion says.'
where trick_type = 'foundation_most_some_reverse';

update public.syllogism_questions
set explanation = 'Picture 10 consent forms and 1,000 scanned records. All 10 consent forms are scanned records, satisfying the premise. But those 10 are a tiny fraction of the 1,000 scanned records, so most scanned records are not consent forms.'
where trick_type = 'foundation_most_converse_trap';

update public.syllogism_questions
set explanation = 'The rule says un-shortlisted applications get archived. This application was not archived, so it must have been shortlisted — that is the only way to avoid being archived under the rule.'
where trick_type = 'foundation_conditional_not_then_contrapositive';

update public.syllogism_questions
set explanation = 'The planning applications that are reviewed documents, and the reviewed documents that are archived files, can be entirely different batches. The planning applications could sit in the un-archived portion of reviewed documents, leaving most of them un-archived.'
where trick_type = 'foundation_most_most_not_guaranteed';


-- ========== 20260519170000_user_question_history.sql ==========
-- =============================================================================
-- User question-history system
-- =============================================================================
-- user_question_history  – append-only log of every question/block served.
-- user_trainer_state     – mutable per-user per-trainer state (cycle, stats).
--
-- Design notes
-- ─────────────────────────────────────────────────────────────────────────────
-- • auth.uid() is used inside every RPC so no user-id is ever passed from the
--   client, eliminating any risk of one user poisoning another's history.
-- • All writes go through security-definer RPCs; clients may only SELECT their
--   own rows directly (read policies below).
-- • "Reset" never deletes rows — it increments the cycle counter, so all-time
--   stats are always preserved.
-- • Auto-reset fires transparently when the unseen pool hits 0; the student
--   simply receives a fresh batch with no extra round-trip.
-- • trainer_type values used here:
--     'syllogism_foundation' | 'syllogism_micro' | 'syllogism_macro'
--   Future trainers (dm_venn, inference, sjt …) follow the same pattern.
-- =============================================================================


-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.user_question_history (
  id           uuid        not null default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  -- For syllogism_macro this stores the macro_block_id (the unit served).
  -- For all other trainers it stores the individual question id.
  question_id  uuid        not null,
  trainer_type text        not null,
  cycle        smallint    not null default 1 check (cycle >= 1),
  seen_at      timestamptz not null default now(),
  constraint uqh_pkey   primary key (id),
  constraint uqh_unique unique (user_id, question_id, trainer_type, cycle)
);

-- Covers the "count unseen in this cycle" query inside each RPC.
create index if not exists uqh_user_trainer_cycle_idx
  on public.user_question_history (user_id, trainer_type, cycle);

-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_trainer_state (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  trainer_type     text        not null,
  current_cycle    smallint    not null default 1 check (current_cycle >= 1),
  -- How many full-pool cycles the user has completed (including manual resets).
  cycles_completed smallint    not null default 0 check (cycles_completed >= 0),
  last_activity_at timestamptz not null default now(),
  constraint uts_pkey primary key (user_id, trainer_type)
);


-- ─── Row-level security ───────────────────────────────────────────────────────
-- Users may read their own rows (useful for dashboard queries).
-- All writes are handled exclusively by the security-definer RPCs below.

alter table public.user_question_history enable row level security;
alter table public.user_trainer_state     enable row level security;

drop policy if exists "uqh_read_own" on public.user_question_history;
create policy "uqh_read_own"
  on public.user_question_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "uts_read_own" on public.user_trainer_state;
create policy "uts_read_own"
  on public.user_trainer_state
  for select
  using (auth.uid() = user_id);


-- =============================================================================
-- RPC: get_syllogism_foundation_batch
-- =============================================================================
create or replace function public.get_syllogism_foundation_batch(
  p_count integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n         integer;
  v_uid     uuid     := auth.uid();   -- null for anon / unauthenticated
  v_cycle   smallint := 1;
  v_unseen  integer;
  v_ids     uuid[];
  result    jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 12), 50));

  -- ── Seen-question tracking (authenticated users only) ─────────────────────
  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_foundation')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_foundation';

    -- How many foundation questions has this user NOT yet seen this cycle?
    select count(*) into v_unseen
    from syllogism_questions sq
    where sq.question_mode = 'foundation'
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.id
          and h.trainer_type = 'syllogism_foundation'
          and h.cycle        = v_cycle
      );

    -- Auto-reset: pool exhausted → start a fresh cycle silently.
    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_foundation';
    end if;

  end if;

  -- ── Select questions ──────────────────────────────────────────────────────
  select array_agg(sq.id) into v_ids
  from (
    select sq.id
    from syllogism_questions sq
    where sq.question_mode = 'foundation'
      and (
        v_uid is null
        or not exists (
          select 1 from user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = sq.id
            and h.trainer_type = 'syllogism_foundation'
            and h.cycle        = v_cycle
        )
      )
    order by random()
    limit n
  ) sq;

  -- ── Mark as seen ──────────────────────────────────────────────────────────
  if v_uid is not null and v_ids is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    select v_uid, unnest(v_ids), 'syllogism_foundation', v_cycle
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_foundation';
  end if;

  -- ── Build response ────────────────────────────────────────────────────────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.id = any(v_ids);

  return result;
end;
$$;


-- =============================================================================
-- RPC: get_syllogism_micro_batch
-- =============================================================================
create or replace function public.get_syllogism_micro_batch(
  p_count integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n        integer;
  v_uid    uuid     := auth.uid();
  v_cycle  smallint := 1;
  v_unseen integer;
  v_ids    uuid[];
  result   jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_micro')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_micro';

    select count(*) into v_unseen
    from syllogism_questions sq
    where sq.question_mode = 'micro'
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.id
          and h.trainer_type = 'syllogism_micro'
          and h.cycle        = v_cycle
      );

    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_micro';
    end if;

  end if;

  select array_agg(sq.id) into v_ids
  from (
    select sq.id
    from syllogism_questions sq
    where sq.question_mode = 'micro'
      and (
        v_uid is null
        or not exists (
          select 1 from user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = sq.id
            and h.trainer_type = 'syllogism_micro'
            and h.cycle        = v_cycle
        )
      )
    order by random()
    limit n
  ) sq;

  if v_uid is not null and v_ids is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    select v_uid, unnest(v_ids), 'syllogism_micro', v_cycle
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_micro';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.id = any(v_ids);

  return result;
end;
$$;


-- =============================================================================
-- RPC: get_syllogism_macro_block
-- Tracks by macro_block_id (the unit served) not individual question ids.
-- Keeps p_exclude_block_ids for in-session dedup (anon + belt-and-braces).
-- =============================================================================
create or replace function public.get_syllogism_macro_block(
  p_exclude_block_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid     := auth.uid();
  v_cycle       smallint := 1;
  v_unseen      integer;
  chosen_block  uuid;
  result        jsonb;
begin

  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_macro')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_macro';

    -- Count unseen blocks (not questions) for this user this cycle.
    select count(distinct sq.macro_block_id) into v_unseen
    from syllogism_questions sq
    where sq.question_mode  = 'macro'
      and sq.macro_block_id is not null
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.macro_block_id
          and h.trainer_type = 'syllogism_macro'
          and h.cycle        = v_cycle
      );

    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_macro';
    end if;

  end if;

  -- ── Pick a block: exclude in-session list AND db-history for this cycle ───
  select sq.macro_block_id into chosen_block
  from syllogism_questions sq
  where sq.question_mode  = 'macro'
    and sq.macro_block_id is not null
    and not (sq.macro_block_id = any(coalesce(p_exclude_block_ids, '{}')))
    and (
      v_uid is null
      or not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.macro_block_id
          and h.trainer_type = 'syllogism_macro'
          and h.cycle        = v_cycle
      )
    )
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  -- ── Mark block as seen ────────────────────────────────────────────────────
  if v_uid is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, chosen_block, 'syllogism_macro', v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_macro';
  end if;

  -- ── Return questions for the block in stable order ────────────────────────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.question_mode  = 'macro'
    and q.macro_block_id = chosen_block;

  return result;
end;
$$;


-- =============================================================================
-- RPC: reset_trainer_history
-- Increments the cycle for the calling user + trainer. Never deletes data.
-- Only callable by authenticated users (auth.uid() is enforced inside).
-- =============================================================================
create or replace function public.reset_trainer_history(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_cycle          smallint;
  v_cycles_done    smallint;
begin
  if v_uid is null then
    raise exception 'reset_trainer_history: not authenticated';
  end if;

  -- Ensure state row exists before updating.
  insert into user_trainer_state (user_id, trainer_type)
  values (v_uid, p_trainer_type)
  on conflict (user_id, trainer_type) do nothing;

  update user_trainer_state
     set current_cycle    = current_cycle + 1,
         cycles_completed = cycles_completed + 1,
         last_activity_at = now()
   where user_id      = v_uid
     and trainer_type = p_trainer_type
  returning current_cycle, cycles_completed
  into v_cycle, v_cycles_done;

  return jsonb_build_object(
    'ok',               true,
    'trainer_type',     p_trainer_type,
    'current_cycle',    v_cycle,
    'cycles_completed', v_cycles_done
  );
end;
$$;


-- =============================================================================
-- RPC: get_trainer_state
-- Returns history stats for the calling user + trainer.
-- Safe to call at any time; returns {authenticated: false} for anon.
-- =============================================================================
create or replace function public.get_trainer_state(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_state    user_trainer_state%rowtype;
  v_seen_now integer;
  v_seen_all integer;
begin
  if v_uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select * into v_state
  from user_trainer_state
  where user_id = v_uid and trainer_type = p_trainer_type;

  if not found then
    return jsonb_build_object(
      'authenticated',    true,
      'current_cycle',    1,
      'cycles_completed', 0,
      'seen_this_cycle',  0,
      'total_seen',       0,
      'last_activity_at', null::timestamptz
    );
  end if;

  -- Questions seen in the current cycle.
  select count(*) into v_seen_now
  from user_question_history
  where user_id      = v_uid
    and trainer_type = p_trainer_type
    and cycle        = v_state.current_cycle;

  -- Distinct questions ever seen across all cycles (all-time unique).
  select count(distinct question_id) into v_seen_all
  from user_question_history
  where user_id      = v_uid
    and trainer_type = p_trainer_type;

  return jsonb_build_object(
    'authenticated',    true,
    'current_cycle',    v_state.current_cycle,
    'cycles_completed', v_state.cycles_completed,
    'seen_this_cycle',  v_seen_now,
    'total_seen',       v_seen_all,
    'last_activity_at', v_state.last_activity_at
  );
end;
$$;


-- ─── Grants ───────────────────────────────────────────────────────────────────
-- Fetch RPCs: anon + authenticated (same as before — signatures unchanged).
grant execute on function public.get_syllogism_foundation_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer)      to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[])       to anon, authenticated;

-- Management RPCs: authenticated users only.
grant execute on function public.reset_trainer_history(text) to authenticated;
grant execute on function public.get_trainer_state(text)     to authenticated;


-- ========== 20260519180000_sjt_history.sql ==========
-- Extend cross-session question history to SJT trainers.
--
-- The sjt_questions.id column is TEXT (not UUID), so we store
-- md5(q.id)::uuid as the question_id in user_question_history.
-- This gives a stable, deterministic UUID from any text ID.
--
-- Trainer type naming convention:
--   'sjt_appropriateness' | 'sjt_importance' | 'sjt_ranking'
--
-- For authenticated users: DB history drives dedup (cross-session).
-- For anon users:          p_exclude_ids fallback (in-session only, existing behaviour).
--
-- No client-side changes are needed — the RPC signature is unchanged.

create or replace function public.get_random_sjt_question(
  p_type        text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid    := auth.uid();
  v_trainer     text    := 'sjt_' || p_type;
  v_cycle       smallint;
  v_unseen_cnt  integer;
  v_row         public.sjt_questions%rowtype;
begin
  -- ── Validate input ─────────────────────────────────────────────────────────
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type: %', p_type;
  end if;

  -- ── Authenticated path: DB-backed cross-session history ────────────────────
  if v_uid is not null then

    -- Ensure state row exists (upsert keeps last_activity_at fresh)
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count questions not yet seen in the current cycle
    select count(*) into v_unseen_cnt
    from public.sjt_questions q
    where q.type = p_type
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      );

    -- Auto-reset: if all seen, silently start a new cycle
    if v_unseen_cnt = 0 then
      update public.user_trainer_state
      set current_cycle    = current_cycle + 1,
          cycles_completed = cycles_completed + 1,
          last_activity_at = now()
      where user_id = v_uid and trainer_type = v_trainer;

      select current_cycle into v_cycle
      from public.user_trainer_state
      where user_id = v_uid and trainer_type = v_trainer;
    end if;

    -- Pick one unseen question at random
    select q.* into v_row
    from public.sjt_questions q
    where q.type = p_type
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      )
    order by random()
    limit 1;

    if not found then
      return null;
    end if;

    -- Mark as seen
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(v_row.id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return jsonb_build_object(
      'id',           v_row.id,
      'type',         v_row.type,
      'domain',       v_row.domain,
      'difficulty',   v_row.difficulty,
      'stem',         v_row.stem,
      'pivotInsight', v_row.pivot_insight,
      'gmpRef',       v_row.gmp_ref,
      'items',        v_row.items
    );
  end if;

  -- ── Anon path: in-session dedup via p_exclude_ids (unchanged behaviour) ────
  select * into v_row
  from public.sjt_questions q
  where q.type = p_type
    and not (q.id = any(coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',           v_row.id,
    'type',         v_row.type,
    'domain',       v_row.domain,
    'difficulty',   v_row.difficulty,
    'stem',         v_row.stem,
    'pivotInsight', v_row.pivot_insight,
    'gmpRef',       v_row.gmp_ref,
    'items',        v_row.items
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random SJT scenario as JSONB (camelCase). '
  'Authenticated users get cross-session dedup via user_question_history; '
  'anon users get in-session dedup via p_exclude_ids.';

-- Grants unchanged: anon + authenticated
grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;


-- ========== 20260519190000_inference_history.sql ==========
-- Extend cross-session question history to the Inference Trainer.
--
-- Inference passages live purely in client-side TypeScript (PASSAGES array,
-- pass_01 … pass_105). To give the DB an authoritative list we seed a small
-- lookup table here — just IDs, no content.
--
-- The passage IDs are text strings ('pass_01' … 'pass_105'), so we use
-- md5(passage_id)::uuid as the question_id in user_question_history,
-- matching the same pattern used for SJT text IDs.
--
-- Trainer type: 'inference'
--
-- RPC: get_inference_passage(p_current_id text DEFAULT NULL)
--   • Authenticated users: picks unseen passage (cross-session dedup).
--   • Anon users:          picks any passage that is not p_current_id.
--   Returns the passage_id as plain text, or NULL if none available.

-- ── Passage lookup table ─────────────────────────────────────────────────────

create table if not exists public.inference_passages (
  passage_id text primary key,
  is_active  boolean not null default true
);

comment on table public.inference_passages is
  'Authoritative list of Inference Trainer passage IDs (pass_01…pass_105). '
  'Content lives in the front-end TypeScript bundle.';

alter table public.inference_passages enable row level security;
-- No direct SELECT for clients; access is exclusively via the security-definer RPC.

-- Seed all 105 passage IDs (idempotent)
insert into public.inference_passages (passage_id)
select 'pass_' || lpad(n::text, 2, '0')
from generate_series(1, 105) as gs(n)
on conflict (passage_id) do nothing;

-- ── RPC ──────────────────────────────────────────────────────────────────────

create or replace function public.get_inference_passage(
  p_current_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid     := auth.uid();
  v_trainer    text     := 'inference';
  v_cycle      smallint;
  v_unseen_cnt integer;
  v_passage_id text;
begin

  -- ── Authenticated path: DB-backed cross-session history ───────────────────
  if v_uid is not null then

    -- Ensure state row exists
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count unseen active passages in the current cycle
    select count(*) into v_unseen_cnt
    from public.inference_passages p
    where p.is_active = true
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(p.passage_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      );

    -- Auto-reset: if all seen, silently start a new cycle
    if v_unseen_cnt = 0 then
      update public.user_trainer_state
      set current_cycle    = current_cycle + 1,
          cycles_completed = cycles_completed + 1,
          last_activity_at = now()
      where user_id = v_uid and trainer_type = v_trainer;

      select current_cycle into v_cycle
      from public.user_trainer_state
      where user_id = v_uid and trainer_type = v_trainer;
    end if;

    -- Pick one unseen passage at random (avoid current if possible)
    select p.passage_id into v_passage_id
    from public.inference_passages p
    where p.is_active = true
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(p.passage_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      )
      -- Prefer not repeating the passage the user just saw
      and (p_current_id is null or p.passage_id <> p_current_id)
    order by random()
    limit 1;

    -- If only one passage was unseen and it was the current one, allow it
    if v_passage_id is null then
      select p.passage_id into v_passage_id
      from public.inference_passages p
      where p.is_active = true
        and not exists (
          select 1 from public.user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = md5(p.passage_id)::uuid
            and h.trainer_type = v_trainer
            and h.cycle        = v_cycle
        )
      order by random()
      limit 1;
    end if;

    if v_passage_id is null then
      return null;
    end if;

    -- Mark as seen
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(v_passage_id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return v_passage_id;
  end if;

  -- ── Anon path: avoid current passage only ─────────────────────────────────
  select p.passage_id into v_passage_id
  from public.inference_passages p
  where p.is_active = true
    and (p_current_id is null or p.passage_id <> p_current_id)
  order by random()
  limit 1;

  -- Fallback: if only one passage exists and it is the current one
  if v_passage_id is null then
    select p.passage_id into v_passage_id
    from public.inference_passages p
    where p.is_active = true
    order by random()
    limit 1;
  end if;

  return v_passage_id;
end;
$$;

comment on function public.get_inference_passage(text) is
  'Returns the next inference passage ID. '
  'Authenticated users get cross-session dedup; anon users avoid only the current passage.';

grant execute on function public.get_inference_passage(text) to anon, authenticated;


-- ========== 20260519200000_dm_trainer_history.sql ==========
-- Extend the trainer-history system to DM Skills trainers.
--
-- DM trainers (Venn Logic, Data Logic, Argument Judge) always serve
-- the complete question set in order, so per-question dedup would add
-- no value.  Instead we track at the SET level: how many times has
-- the user completed each drill?
--
-- Trainer-type naming convention (matching the rest of the system):
--   'dm_venn_logic' | 'dm_data_logic' | 'dm_argument_judge'
--
-- The client calls complete_dm_trainer_drill once per finished (non-retry)
-- drill.  The function:
--   1. Upserts user_trainer_state so the row exists.
--   2. Increments cycles_completed and bumps the cycle counter so
--      the UX can say "you've done this X times".
--   3. Updates last_activity_at.
--
-- No user_question_history rows are written — a DM cycle = one full drill.

create or replace function public.complete_dm_trainer_drill(
  p_trainer_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;  -- anon users: nothing to record
  end if;

  if p_trainer_type not in ('dm_venn_logic', 'dm_data_logic', 'dm_argument_judge') then
    raise exception 'Invalid DM trainer type: %', p_trainer_type;
  end if;

  insert into public.user_trainer_state (user_id, trainer_type, current_cycle, cycles_completed)
  values (v_uid, p_trainer_type, 2, 1)
  on conflict (user_id, trainer_type) do update
    set current_cycle    = public.user_trainer_state.current_cycle + 1,
        cycles_completed = public.user_trainer_state.cycles_completed + 1,
        last_activity_at = now();
end;
$$;

comment on function public.complete_dm_trainer_drill(text) is
  'Records one completed DM drill run in user_trainer_state (cycles_completed). '
  'Call once per finished non-retry session. No-op for anon users.';

grant execute on function public.complete_dm_trainer_drill(text) to authenticated;


-- ========== 20260520100000_question_lab_tables.sql ==========
-- Question Lab: core tables
--
-- Creates four tables:
--   trainer_questions         - authored skills-trainer questions
--   trainer_question_attempts - per-question analytics (subskill, time, answer)
--   question_reports          - student flags on live questions
--   question_reviews          - human/system review records
--
-- Also installs:
--   prevent_active_question_edit() trigger on trainer_questions
--   update_updated_at() trigger on trainer_questions
--
-- All student access goes through security-definer RPCs, not direct table reads.
-- RLS is enabled on all tables; permissive admin policies are added separately
-- once the dashboard is built.

-- ─── trainer_questions ────────────────────────────────────────────────────────

create table public.trainer_questions (
  id                    uuid        primary key default gen_random_uuid(),
  legacy_id             text,
  section               text        not null
                          check (section in ('vr', 'dm', 'qr', 'sjt')),
  trainer_type          text        not null
                          check (trainer_type in (
                            'venn-logic', 'data-logic', 'argument-judge',
                            'sjt-appropriateness', 'sjt-importance', 'sjt-ranking',
                            'inference', 'vr-passages', 'qr-conversions'
                          )),
  question_kind         text        not null
                          check (question_kind in (
                            'mcq', 'appropriateness', 'importance',
                            'ranking', 'numeric', 'true-false-ct'
                          )),
  status                text        not null default 'draft'
                          check (status in ('draft', 'active', 'archived')),
  difficulty            text        not null default 'medium'
                          check (difficulty in ('easy', 'medium', 'hard')),
  skill_tag             text        not null default '',
  stem                  text        not null default '',
  explanation           text        not null default '',
  content               jsonb       not null default '{}'::jsonb,
  media                 jsonb       not null default '[]'::jsonb,
  quality_status        text        not null default 'unchecked'
                          check (quality_status in ('unchecked', 'pass', 'needs_review', 'fail')),
  quality_notes         text,
  last_reviewed_at      timestamptz,
  is_flagged            boolean     not null default false,
  flag_count            integer     not null default 0,
  replaces_question_id  uuid        references public.trainer_questions(id),
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.trainer_questions is
  'Authored skills-trainer questions. Students access via security-definer RPCs only.';

comment on column public.trainer_questions.legacy_id is
  'Original local ID (e.g. venn-logic-001) preserved during migration.';

comment on column public.trainer_questions.content is
  'Type-specific question payload. Shape depends on question_kind.';

comment on column public.trainer_questions.replaces_question_id is
  'Set when this draft was created to replace an active question. '
  'On activation, the original is archived.';

-- Indexes for dashboard filters and RPC queries
create index idx_tq_trainer_type  on public.trainer_questions (trainer_type);
create index idx_tq_section       on public.trainer_questions (section);
create index idx_tq_status        on public.trainer_questions (status);
create index idx_tq_skill_tag     on public.trainer_questions (skill_tag);
create index idx_tq_quality       on public.trainer_questions (quality_status);
create index idx_tq_flagged       on public.trainer_questions (is_flagged) where is_flagged = true;
create index idx_tq_difficulty    on public.trainer_questions (difficulty);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tg_trainer_questions_updated_at
  before update on public.trainer_questions
  for each row execute function public.set_updated_at();

-- ─── Active question protection trigger ───────────────────────────────────────
--
-- Blocks changes to core content fields while status = 'active'.
-- These fields must only change via the duplicate-edit-archive-activate workflow.
-- The UI also disables these fields, but the trigger is the hard guarantee.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.explanation   is distinct from old.explanation   or
      new.content       is distinct from old.content       or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit content fields on an active question (id: %). '
        'Duplicate it as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks changes to stem, explanation, content, media, difficulty, skill_tag, '
  'trainer_type, question_kind while the question is active. '
  'These fields can only change via the duplicate-draft-archive-activate workflow.';

create trigger tg_prevent_active_question_edit
  before update on public.trainer_questions
  for each row execute function public.prevent_active_question_edit();

-- ─── RLS: trainer_questions ───────────────────────────────────────────────────
--
-- No direct reads for authenticated or anon users.
-- Students use security-definer RPCs. Admin dashboard uses service role.
-- Permissive admin policies will be added when the dashboard is built.

alter table public.trainer_questions enable row level security;

-- ─── trainer_question_attempts ────────────────────────────────────────────────
--
-- One row per question attempt. Records subskill analytics from day one.
-- Users can insert and read their own rows. Anon sessions use user_id = null.

create table public.trainer_question_attempts (
  id                   uuid        primary key default gen_random_uuid(),
  question_id          uuid        not null references public.trainer_questions(id),
  user_id              uuid,       -- null for anonymous
  session_id           uuid,       -- groups attempts within one trainer session
  trainer_type         text        not null,
  skill_tag            text        not null default '',
  difficulty           text        not null
                         check (difficulty in ('easy', 'medium', 'hard')),
  is_correct           boolean     not null,
  selected_answer      text,       -- option id, verdict, rating value, numeric, etc.
  changed_answer       boolean     not null default false,
  time_taken_seconds   integer     not null,
  explanation_viewed   boolean     not null default false,
  attempt_number       integer     not null default 1,
  created_at           timestamptz not null default now()
);

comment on table public.trainer_question_attempts is
  'Per-question attempt analytics. Enables subskill performance breakdowns '
  '(e.g. strong on Venn totals, weak on exactly-two questions).';

comment on column public.trainer_question_attempts.session_id is
  'Client-generated UUID grouping all attempts within one trainer session.';

comment on column public.trainer_question_attempts.changed_answer is
  'True if the user changed their selected answer before final submission.';

comment on column public.trainer_question_attempts.attempt_number is
  '1 = first time this user has attempted this question.';

create index idx_tqa_question_id  on public.trainer_question_attempts (question_id);
create index idx_tqa_user_id      on public.trainer_question_attempts (user_id);
create index idx_tqa_trainer_type on public.trainer_question_attempts (trainer_type);
create index idx_tqa_skill_tag    on public.trainer_question_attempts (skill_tag);
create index idx_tqa_created_at   on public.trainer_question_attempts (created_at);

alter table public.trainer_question_attempts enable row level security;

-- Authenticated users can insert their own attempts
create policy "Users can log their own attempts"
  on public.trainer_question_attempts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Authenticated users can read their own attempts
create policy "Users can read their own attempts"
  on public.trainer_question_attempts
  for select
  to authenticated
  using (user_id = auth.uid());

-- Anon users can insert with null user_id (session-only tracking)
create policy "Anon users can log attempts"
  on public.trainer_question_attempts
  for insert
  to anon
  with check (user_id is null);

-- ─── question_reports ─────────────────────────────────────────────────────────
--
-- Student flags on live questions. One row per report.
-- Inserting a report also increments flag_count on the question via trigger.

create table public.question_reports (
  id                    uuid        primary key default gen_random_uuid(),
  trainer_question_id   uuid        not null references public.trainer_questions(id),
  user_id               uuid,
  reason                text        not null
                          check (reason in (
                            'typo', 'ambiguous', 'wrong_answer',
                            'bad_explanation', 'technical_issue', 'other'
                          )),
  notes                 text,
  status                text        not null default 'open'
                          check (status in ('open', 'reviewed', 'dismissed', 'fixed')),
  created_at            timestamptz not null default now(),
  reviewed_by           uuid,
  reviewed_at           timestamptz
);

comment on table public.question_reports is
  'Student flags on active questions. '
  'Resolved via duplicate-draft-archive-activate workflow when content needs fixing.';

create index idx_qr_question_id on public.question_reports (trainer_question_id);
create index idx_qr_status      on public.question_reports (status);

alter table public.question_reports enable row level security;

-- Students can report active questions only
create policy "Users can submit reports"
  on public.question_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Students can read their own reports
create policy "Users can read their own reports"
  on public.question_reports
  for select
  to authenticated
  using (user_id = auth.uid());

-- ─── Flag count trigger ───────────────────────────────────────────────────────
--
-- When a report is inserted, increment flag_count and set is_flagged = true
-- on the question. This keeps the dashboard filter fast without a join.

create or replace function public.increment_question_flag_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trainer_questions
  set
    flag_count = flag_count + 1,
    is_flagged = true
  where id = new.trainer_question_id;
  return new;
end;
$$;

create trigger tg_increment_flag_count
  after insert on public.question_reports
  for each row execute function public.increment_question_flag_count();

-- ─── question_reviews ─────────────────────────────────────────────────────────
--
-- Human or system review records. Written by the CSV import workflow or
-- future automated audit jobs. Updates quality_status on the question.

create table public.question_reviews (
  id                    uuid        primary key default gen_random_uuid(),
  trainer_question_id   uuid        not null references public.trainer_questions(id),
  review_type           text        not null check (review_type in ('human', 'system')),
  status                text        not null check (status in ('pass', 'needs_review', 'fail')),
  summary               text        not null,
  findings              jsonb       not null default '[]'::jsonb,
  suggested_revision    jsonb,
  created_by            uuid,
  created_at            timestamptz not null default now()
);

comment on table public.question_reviews is
  'Human and system review records. '
  'A review with status=fail triggers quality_status=needs_review on the question. '
  'Suggested revisions are applied via the duplicate-draft workflow, not directly.';

comment on column public.question_reviews.findings is
  'Array of {field, issue, suggestion} objects identifying specific problems.';

comment on column public.question_reviews.suggested_revision is
  'Partial question fields suggested by the reviewer. '
  'Never applied directly to active questions.';

create index idx_qrev_question_id on public.question_reviews (trainer_question_id);
create index idx_qrev_status      on public.question_reviews (status);

alter table public.question_reviews enable row level security;

-- ─── Review outcome trigger ───────────────────────────────────────────────────
--
-- When a review is inserted, update quality_status on the question to match.

create or replace function public.apply_review_quality_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trainer_questions
  set
    quality_status   = case new.status
                         when 'pass'         then 'pass'
                         when 'needs_review' then 'needs_review'
                         when 'fail'         then 'needs_review'
                       end,
    quality_notes    = new.summary,
    last_reviewed_at = now()
  where id = new.trainer_question_id;
  return new;
end;
$$;

create trigger tg_apply_review_quality_status
  after insert on public.question_reviews
  for each row execute function public.apply_review_quality_status();


-- ========== 20260520110000_dm_rpc_question_lab.sql ==========
-- Switch get_dm_trainer_drill to read from trainer_questions.
--
-- The old dm_trainer_questions table is NOT dropped — it stays for rollback.
-- To roll back: redeploy the previous version of this function from
-- migration 042_dm_trainer_questions_and_sessions.sql.
--
-- The returned JSON shape is identical to the old RPC so dmTrainerApi.ts
-- needs no changes. Key mapping:
--   legacy_id            → id          (used by frontend for local enrichment lookup)
--   content->question    → question
--   content->options     → options     (object converted back to [{id, text}] array)
--   content->correctAnswer → correctAnswer
--   content->commonTrap  → commonTrap
--   content->workingSteps → optionalWorkingSteps
--   skill_tag            → skillTag
--   trainer_type         → trainerType
--   status = 'active'    replaces is_active = true

create or replace function public.get_dm_trainer_drill(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_trainer_type is null or p_trainer_type not in ('venn-logic', 'data-logic', 'argument-judge') then
    raise exception 'Invalid trainer type';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          q.legacy_id,
        'dbId',        q.id,
        'trainerType', q.trainer_type,
        'difficulty',  q.difficulty,
        'stem',        q.stem,
        'question',    q.content->>'question',
        'options',     jsonb_build_array(
                         jsonb_build_object('id', 'A', 'text', q.content->'options'->>'A'),
                         jsonb_build_object('id', 'B', 'text', q.content->'options'->>'B'),
                         jsonb_build_object('id', 'C', 'text', q.content->'options'->>'C'),
                         jsonb_build_object('id', 'D', 'text', q.content->'options'->>'D')
                       ),
        'correctAnswer',        q.content->>'correctAnswer',
        'explanation',          q.explanation,
        'skillTag',             q.skill_tag,
        'commonTrap',           q.content->>'commonTrap',
        'optionalWorkingSteps', q.content->'workingSteps',
        'review',               jsonb_build_object(
                                  'ambiguityRisk',   'low',
                                  'whySafeToInclude','Active migrated question'
                                )
      )
      order by q.legacy_id
    ),
    '[]'::jsonb
  )
  into result
  from public.trainer_questions q
  where q.trainer_type = p_trainer_type
    and q.status = 'active';

  return result;
end;
$$;

comment on function public.get_dm_trainer_drill(text) is
  'Returns active DM skills trainer questions from trainer_questions as camelCase JSON array. '
  'Shape is identical to the previous version so no frontend changes are needed. '
  'Old dm_trainer_questions table is kept for rollback. Callable by anon and authenticated.';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;


-- ========== 20260520120000_question_lab_admin_policies.sql ==========
-- Admin access for Question Lab via security-definer RPCs.
--
-- Requires profiles.role = 'admin' for the calling user.
-- profiles.role column added by 004_profiles_role_admin.sql (applied separately to remote).
--
-- RPCs:
--   admin_get_trainer_questions(filters)  - paginated list with filters
--   admin_update_question_status(id, status) - activate / archive
--   admin_get_question_coverage()         - counts by type/status/difficulty

-- ─── admin_get_trainer_questions ─────────────────────────────────────────────

create or replace function public.admin_get_trainer_questions(
  p_section        text    default null,
  p_trainer_type   text    default null,
  p_status         text    default null,
  p_quality_status text    default null,
  p_difficulty     text    default null,
  p_is_flagged     boolean default null,
  p_search         text    default null,
  p_limit          integer default 100,
  p_offset         integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result       jsonb;
  total_count  integer;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  select count(*)::integer
  into total_count
  from public.trainer_questions q
  where
    (p_section        is null or q.section        = p_section)
    and (p_trainer_type   is null or q.trainer_type   = p_trainer_type)
    and (p_status         is null or q.status         = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty     is null or q.difficulty     = p_difficulty)
    and (p_is_flagged     is null or q.is_flagged     = p_is_flagged)
    and (
      p_search is null
      or q.stem        ilike '%' || p_search || '%'
      or q.skill_tag   ilike '%' || p_search || '%'
      or q.legacy_id   ilike '%' || p_search || '%'
    );

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id',             q.id,
          'legacy_id',      q.legacy_id,
          'section',        q.section,
          'trainer_type',   q.trainer_type,
          'question_kind',  q.question_kind,
          'status',         q.status,
          'difficulty',     q.difficulty,
          'skill_tag',      q.skill_tag,
          'stem',           q.stem,
          'explanation',    q.explanation,
          'content',        q.content,
          'quality_status', q.quality_status,
          'quality_notes',  q.quality_notes,
          'is_flagged',     q.is_flagged,
          'flag_count',     q.flag_count,
          'replaces_question_id', q.replaces_question_id,
          'created_at',     q.created_at,
          'updated_at',     q.updated_at
        )
        order by q.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.trainer_questions q
  where
    (p_section        is null or q.section        = p_section)
    and (p_trainer_type   is null or q.trainer_type   = p_trainer_type)
    and (p_status         is null or q.status         = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty     is null or q.difficulty     = p_difficulty)
    and (p_is_flagged     is null or q.is_flagged     = p_is_flagged)
    and (
      p_search is null
      or q.stem        ilike '%' || p_search || '%'
      or q.skill_tag   ilike '%' || p_search || '%'
      or q.legacy_id   ilike '%' || p_search || '%'
    )
  limit  p_limit
  offset p_offset;

  return result;
end;
$$;

comment on function public.admin_get_trainer_questions is
  'Paginated list of trainer_questions with filters. Admin only.';

grant execute on function public.admin_get_trainer_questions(text,text,text,text,text,boolean,text,integer,integer)
  to authenticated;

-- ─── admin_update_question_status ────────────────────────────────────────────

create or replace function public.admin_update_question_status(
  p_id     uuid,
  p_status text   -- 'draft' | 'active' | 'archived'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  old_status   text;
  old_section  text;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select status, section into old_status, old_section
  from public.trainer_questions where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  -- When activating a replacement, archive the original
  if p_status = 'active' then
    update public.trainer_questions
    set status = 'archived'
    where id = (
      select replaces_question_id
      from public.trainer_questions
      where id = p_id
    )
    and status = 'active';
  end if;

  -- Direct update: bypasses prevent_active_question_edit because
  -- we only change status, not content fields.
  update public.trainer_questions
  set status = p_status
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

comment on function public.admin_update_question_status is
  'Change question status (draft/active/archived). Admin only. '
  'Activating a replacement auto-archives the original it replaces.';

grant execute on function public.admin_update_question_status(uuid, text)
  to authenticated;

-- ─── admin_get_question_coverage ─────────────────────────────────────────────

create or replace function public.admin_get_question_coverage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result       jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  select jsonb_build_object(
    'by_trainer_type', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select trainer_type, count(*)::int as total,
               count(*) filter (where status = 'active')::int  as active,
               count(*) filter (where status = 'draft')::int   as draft,
               count(*) filter (where status = 'archived')::int as archived
        from public.trainer_questions
        group by trainer_type
        order by trainer_type
      ) t
    ),
    'by_difficulty', (
      select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb)
      from (
        select difficulty, count(*)::int as total,
               count(*) filter (where status = 'active')::int as active
        from public.trainer_questions
        group by difficulty
        order by difficulty
      ) d
    ),
    'by_quality_status', (
      select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb)
      from (
        select quality_status, count(*)::int as total
        from public.trainer_questions
        group by quality_status
        order by quality_status
      ) q
    ),
    'by_status', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      from (
        select status, count(*)::int as total
        from public.trainer_questions
        group by status
        order by status
      ) s
    ),
    'flagged_count', (
      select count(*)::int from public.trainer_questions where is_flagged = true
    )
  )
  into result;

  return result;
end;
$$;

comment on function public.admin_get_question_coverage is
  'Coverage counts by trainer_type, difficulty, quality, status. Admin only.';

grant execute on function public.admin_get_question_coverage()
  to authenticated;

-- ─── admin_duplicate_question_as_draft ───────────────────────────────────────

create or replace function public.admin_duplicate_question_as_draft(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  src          public.trainer_questions;
  new_id       uuid;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  select * into src from public.trainer_questions where id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  new_id := gen_random_uuid();

  insert into public.trainer_questions (
    id, legacy_id, section, trainer_type, question_kind,
    status, difficulty, skill_tag, stem, explanation,
    content, media, quality_status, quality_notes,
    is_flagged, flag_count, replaces_question_id,
    created_by, updated_by
  ) values (
    new_id,
    null,                 -- no legacy_id for new drafts
    src.section,
    src.trainer_type,
    src.question_kind,
    'draft',              -- always draft
    src.difficulty,
    src.skill_tag,
    src.stem,
    src.explanation,
    src.content,
    src.media,
    'unchecked',
    'Duplicated from ' || coalesce(src.legacy_id, src.id::text),
    false,
    0,
    case when src.status = 'active' then p_id else null end,
    auth.uid(),
    null
  );

  return jsonb_build_object('ok', true, 'new_id', new_id, 'source_id', p_id);
end;
$$;

comment on function public.admin_duplicate_question_as_draft is
  'Duplicates a question as a new draft. If source is active, sets replaces_question_id. Admin only.';

grant execute on function public.admin_duplicate_question_as_draft(uuid)
  to authenticated;


-- ========== 20260520130000_sjt_rpc_question_lab.sql ==========
-- Switch get_random_sjt_question to read from trainer_questions.
--
-- The old sjt_questions table is NOT dropped — it stays for rollback.
-- To roll back: redeploy the previous version from 20260519180000_sjt_history.sql.
--
-- Key mapping:
--   legacy_id            → id          (text ID returned to frontend, used for history hash)
--   trainer_type         → 'sjt-' || p_type   (dash convention in trainer_questions)
--   content->>'domain'   → domain
--   content->>'pivotInsight' → pivotInsight
--   content->'gmpRef'    → gmpRef
--   content->'items'     → items
--   status = 'active'    replaces no filter (old table had no status)
--
-- History tables (user_question_history, user_trainer_state) keep
--   trainer_type = 'sjt_' || p_type  (underscore) for backward compatibility.
-- History question_id stays md5(legacy_id)::uuid — identical to old md5(q.id)::uuid
-- because legacy_id equals the original sjt_questions.id.

create or replace function public.get_random_sjt_question(
  p_type        text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid    := auth.uid();
  v_trainer     text    := 'sjt_' || p_type;   -- underscore: history table convention
  v_tq_type     text    := 'sjt-' || p_type;   -- dash: trainer_questions convention
  v_cycle       smallint;
  v_unseen_cnt  integer;

  -- explicit fields instead of %rowtype (table changed)
  v_id          text;
  v_difficulty  text;
  v_stem        text;
  v_content     jsonb;
begin
  -- ── Validate input ─────────────────────────────────────────────────────────
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type: %', p_type;
  end if;

  -- ── Authenticated path: DB-backed cross-session history ────────────────────
  if v_uid is not null then

    -- Ensure state row exists
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count unseen questions in current cycle
    select count(*) into v_unseen_cnt
    from public.trainer_questions q
    where q.trainer_type = v_tq_type
      and q.status = 'active'
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.legacy_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      );

    -- Auto-reset: if all seen, start a new cycle
    if v_unseen_cnt = 0 then
      update public.user_trainer_state
      set current_cycle    = current_cycle + 1,
          cycles_completed = cycles_completed + 1,
          last_activity_at = now()
      where user_id = v_uid and trainer_type = v_trainer;

      select current_cycle into v_cycle
      from public.user_trainer_state
      where user_id = v_uid and trainer_type = v_trainer;
    end if;

    -- Pick one unseen question at random
    select q.legacy_id, q.difficulty, q.stem, q.content
    into   v_id, v_difficulty, v_stem, v_content
    from public.trainer_questions q
    where q.trainer_type = v_tq_type
      and q.status = 'active'
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.legacy_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      )
    order by random()
    limit 1;

    if not found then
      return null;
    end if;

    -- Mark as seen
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(v_id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return jsonb_build_object(
      'id',           v_id,
      'type',         p_type,
      'domain',       v_content->>'domain',
      'difficulty',   v_difficulty,
      'stem',         v_stem,
      'pivotInsight', v_content->>'pivotInsight',
      'gmpRef',       v_content->'gmpRef',
      'items',        v_content->'items'
    );
  end if;

  -- ── Anon path: in-session dedup via p_exclude_ids ────────────────────────
  select q.legacy_id, q.difficulty, q.stem, q.content
  into   v_id, v_difficulty, v_stem, v_content
  from public.trainer_questions q
  where q.trainer_type = v_tq_type
    and q.status = 'active'
    and not (q.legacy_id = any(coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',           v_id,
    'type',         p_type,
    'domain',       v_content->>'domain',
    'difficulty',   v_difficulty,
    'stem',         v_stem,
    'pivotInsight', v_content->>'pivotInsight',
    'gmpRef',       v_content->'gmpRef',
    'items',        v_content->'items'
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random active SJT scenario from trainer_questions as JSONB (camelCase). '
  'Authenticated users get cross-session dedup via user_question_history; '
  'anon users get in-session dedup via p_exclude_ids. '
  'Old sjt_questions table is kept for rollback.';

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;


-- ========== 20260520140000_admin_reports_rpc.sql ==========
-- Admin RPCs for question reports management.
--
-- admin_get_question_reports  - paginated list of student reports with question info
-- admin_update_report_status  - change report status (reviewed/dismissed/fixed)

-- ─── admin_get_question_reports ──────────────────────────────────────────────

create or replace function public.admin_get_question_reports(
  p_status  text    default null,   -- 'open' | 'reviewed' | 'dismissed' | 'fixed'
  p_limit   integer default 100,
  p_offset  integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin    boolean;
  result      jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  select count(*)::integer
  into total_count
  from public.question_reports r
  where (p_status is null or r.status = p_status);

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id',          r.id,
          'reason',      r.reason,
          'notes',       r.notes,
          'status',      r.status,
          'created_at',  r.created_at,
          'reviewed_at', r.reviewed_at,
          'question_id',       q.id,
          'question_legacy_id', q.legacy_id,
          'question_trainer_type', q.trainer_type,
          'question_status',   q.status,
          'question_stem',     q.stem,
          'question_flag_count', q.flag_count
        )
        order by r.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.question_reports r
  left join public.trainer_questions q on q.id = r.trainer_question_id
  where (p_status is null or r.status = p_status)
  limit  p_limit
  offset p_offset;

  return result;
end;
$$;

comment on function public.admin_get_question_reports is
  'Paginated list of question_reports with joined question info. Admin only.';

grant execute on function public.admin_get_question_reports(text, integer, integer)
  to authenticated;

-- ─── admin_update_report_status ──────────────────────────────────────────────

create or replace function public.admin_update_report_status(
  p_id     uuid,
  p_status text   -- 'reviewed' | 'dismissed' | 'fixed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  if p_status not in ('reviewed', 'dismissed', 'fixed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.question_reports
  set status      = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_id;

  if not found then
    raise exception 'Report not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

comment on function public.admin_update_report_status is
  'Update question report status (reviewed/dismissed/fixed). Admin only.';

grant execute on function public.admin_update_report_status(uuid, text)
  to authenticated;


-- ========== 20260520153221_repair_question_lab_admin_rpcs.sql ==========
-- Repair/forward migration for Question Lab admin RPCs.
--
-- The frontend calls these via PostgREST. Some deployed Supabase projects have
-- the trainer question tables and public trainer RPCs but are missing the admin
-- RPC layer in the schema cache, which causes PGRST202 "function not found".

create or replace function public.admin_get_trainer_questions(
  p_section        text    default null,
  p_trainer_type   text    default null,
  p_status         text    default null,
  p_quality_status text    default null,
  p_difficulty     text    default null,
  p_is_flagged     boolean default null,
  p_search         text    default null,
  p_limit          integer default 100,
  p_offset         integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::integer
  into total_count
  from public.trainer_questions q
  where
    (p_section is null or q.section = p_section)
    and (p_trainer_type is null or q.trainer_type = p_trainer_type)
    and (p_status is null or q.status = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (p_is_flagged is null or q.is_flagged = p_is_flagged)
    and (
      p_search is null
      or q.stem ilike '%' || p_search || '%'
      or q.skill_tag ilike '%' || p_search || '%'
      or q.legacy_id ilike '%' || p_search || '%'
    );

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'legacy_id', q.legacy_id,
          'section', q.section,
          'trainer_type', q.trainer_type,
          'question_kind', q.question_kind,
          'status', q.status,
          'difficulty', q.difficulty,
          'skill_tag', q.skill_tag,
          'stem', q.stem,
          'explanation', q.explanation,
          'content', q.content,
          'quality_status', q.quality_status,
          'quality_notes', q.quality_notes,
          'is_flagged', q.is_flagged,
          'flag_count', q.flag_count,
          'replaces_question_id', q.replaces_question_id,
          'created_at', q.created_at,
          'updated_at', q.updated_at
        )
        order by q.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.trainer_questions q
  where
    (p_section is null or q.section = p_section)
    and (p_trainer_type is null or q.trainer_type = p_trainer_type)
    and (p_status is null or q.status = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (p_is_flagged is null or q.is_flagged = p_is_flagged)
    and (
      p_search is null
      or q.stem ilike '%' || p_search || '%'
      or q.skill_tag ilike '%' || p_search || '%'
      or q.legacy_id ilike '%' || p_search || '%'
    )
  limit p_limit
  offset p_offset;

  return result;
end;
$$;

grant execute on function public.admin_get_trainer_questions(text,text,text,text,text,boolean,text,integer,integer)
  to authenticated;

create or replace function public.admin_get_question_coverage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'by_trainer_type', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select trainer_type,
               count(*)::int as total,
               count(*) filter (where status = 'active')::int as active,
               count(*) filter (where status = 'draft')::int as draft,
               count(*) filter (where status = 'archived')::int as archived
        from public.trainer_questions
        group by trainer_type
        order by trainer_type
      ) t
    ),
    'by_difficulty', (
      select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb)
      from (
        select difficulty,
               count(*)::int as total,
               count(*) filter (where status = 'active')::int as active
        from public.trainer_questions
        group by difficulty
        order by difficulty
      ) d
    ),
    'by_quality_status', (
      select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb)
      from (
        select quality_status, count(*)::int as total
        from public.trainer_questions
        group by quality_status
        order by quality_status
      ) q
    ),
    'by_status', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      from (
        select status, count(*)::int as total
        from public.trainer_questions
        group by status
        order by status
      ) s
    ),
    'flagged_count', (
      select count(*)::int
      from public.trainer_questions
      where is_flagged = true
    )
  )
  into result;

  return result;
end;
$$;

grant execute on function public.admin_get_question_coverage()
  to authenticated;

create or replace function public.admin_update_question_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_status = 'active' then
    update public.trainer_questions
    set status = 'archived'
    where id = (
      select replaces_question_id
      from public.trainer_questions
      where id = p_id
    )
    and status = 'active';
  end if;

  update public.trainer_questions
  set status = p_status
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

grant execute on function public.admin_update_question_status(uuid, text)
  to authenticated;

create or replace function public.admin_duplicate_question_as_draft(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  src public.trainer_questions;
  new_id uuid;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into src
  from public.trainer_questions
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  new_id := gen_random_uuid();

  insert into public.trainer_questions (
    id, legacy_id, section, trainer_type, question_kind,
    status, difficulty, skill_tag, stem, explanation,
    content, media, quality_status, quality_notes,
    is_flagged, flag_count, replaces_question_id,
    created_by, updated_by
  ) values (
    new_id,
    null,
    src.section,
    src.trainer_type,
    src.question_kind,
    'draft',
    src.difficulty,
    src.skill_tag,
    src.stem,
    src.explanation,
    src.content,
    src.media,
    'unchecked',
    'Duplicated from ' || coalesce(src.legacy_id, src.id::text),
    false,
    0,
    case when src.status = 'active' then p_id else null end,
    auth.uid(),
    null
  );

  return jsonb_build_object('ok', true, 'new_id', new_id, 'source_id', p_id);
end;
$$;

grant execute on function public.admin_duplicate_question_as_draft(uuid)
  to authenticated;

create or replace function public.admin_get_question_reports(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::integer
  into total_count
  from public.question_reports r
  where (p_status is null or r.status = p_status);

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'notes', r.notes,
          'status', r.status,
          'created_at', r.created_at,
          'reviewed_at', r.reviewed_at,
          'question_id', q.id,
          'question_legacy_id', q.legacy_id,
          'question_trainer_type', q.trainer_type,
          'question_status', q.status,
          'question_stem', q.stem,
          'question_flag_count', q.flag_count
        )
        order by r.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.question_reports r
  left join public.trainer_questions q on q.id = r.trainer_question_id
  where (p_status is null or r.status = p_status)
  limit p_limit
  offset p_offset;

  return result;
end;
$$;

grant execute on function public.admin_get_question_reports(text, integer, integer)
  to authenticated;

create or replace function public.admin_update_report_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_status not in ('reviewed', 'dismissed', 'fixed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.question_reports
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_id;

  if not found then
    raise exception 'Report not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

grant execute on function public.admin_update_report_status(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260520160000_admin_import_trainer_drafts.sql ==========
-- Admin: import AI-generated questions as drafts (upsert by legacy_id).

create unique index if not exists idx_tq_legacy_id_unique
  on public.trainer_questions (legacy_id)
  where legacy_id is not null;

create or replace function public.admin_import_trainer_question_drafts(
  p_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin   boolean;
  item       jsonb;
  items      jsonb;
  legacy     text;
  existing   public.trainer_questions%rowtype;
  created_n  integer := 0;
  updated_n  integer := 0;
  skipped    jsonb := '[]'::jsonb;
  errors     jsonb := '[]'::jsonb;
  i          integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_questions is null then
    raise exception 'p_questions is required';
  end if;

  if jsonb_typeof(p_questions) = 'array' then
    items := p_questions;
  elsif jsonb_typeof(p_questions) = 'object' and (p_questions ? 'questions') then
    items := p_questions->'questions';
  else
    raise exception 'Expected a JSON array or { "questions": [...] }';
  end if;

  if jsonb_typeof(items) <> 'array' then
    raise exception 'questions must be a JSON array';
  end if;

  for i in 0 .. jsonb_array_length(items) - 1 loop
    item := items->i;
    legacy := nullif(trim(both from coalesce(item->>'legacy_id', item->>'id', '')), '');

    if legacy is null then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i,
        'legacy_id', null,
        'message', 'Missing legacy_id or id'
      ));
      continue;
    end if;

    if coalesce(item->>'trainer_type', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing trainer_type'
      ));
      continue;
    end if;

    if coalesce(item->>'section', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing section'
      ));
      continue;
    end if;

    if coalesce(item->>'question_kind', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing question_kind'
      ));
      continue;
    end if;

    if item->'content' is null or jsonb_typeof(item->'content') <> 'object' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing or invalid content object'
      ));
      continue;
    end if;

    select * into existing
    from public.trainer_questions
    where legacy_id = legacy;

    if found then
      if existing.status = 'active' then
        skipped := skipped || jsonb_build_array(jsonb_build_object(
          'legacy_id', legacy,
          'reason', 'Already active. Duplicate as draft in Question Lab to replace.'
        ));
        continue;
      end if;

      update public.trainer_questions
      set
        section        = item->>'section',
        trainer_type   = item->>'trainer_type',
        question_kind  = item->>'question_kind',
        difficulty     = coalesce(nullif(item->>'difficulty', ''), 'medium'),
        skill_tag      = coalesce(item->>'skill_tag', ''),
        stem           = coalesce(item->>'stem', ''),
        explanation    = coalesce(item->>'explanation', ''),
        content        = item->'content',
        media          = coalesce(item->'media', '[]'::jsonb),
        quality_status = coalesce(nullif(item->>'quality_status', ''), 'unchecked'),
        quality_notes  = item->>'quality_notes',
        status         = 'draft',
        updated_by     = auth.uid()
      where legacy_id = legacy;

      updated_n := updated_n + 1;
    else
      insert into public.trainer_questions (
        legacy_id,
        section,
        trainer_type,
        question_kind,
        status,
        difficulty,
        skill_tag,
        stem,
        explanation,
        content,
        media,
        quality_status,
        quality_notes,
        created_by,
        updated_by
      ) values (
        legacy,
        item->>'section',
        item->>'trainer_type',
        item->>'question_kind',
        'draft',
        coalesce(nullif(item->>'difficulty', ''), 'medium'),
        coalesce(item->>'skill_tag', ''),
        coalesce(item->>'stem', ''),
        coalesce(item->>'explanation', ''),
        item->'content',
        coalesce(item->'media', '[]'::jsonb),
        coalesce(nullif(item->>'quality_status', ''), 'unchecked'),
        item->>'quality_notes',
        auth.uid(),
        auth.uid()
      );

      created_n := created_n + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created', created_n,
    'updated', updated_n,
    'skipped', skipped,
    'errors', errors
  );
end;
$$;

comment on function public.admin_import_trainer_question_drafts is
  'Import AI-generated questions as drafts. Upserts by legacy_id. Skips active rows. Admin only.';

grant execute on function public.admin_import_trainer_question_drafts(jsonb)
  to authenticated;


-- ========== 20260520170000_trainer_rpc_full_content.sql ==========
-- Return full DM teaching fields from trainer_questions.content (not only local TS enrichment).

create or replace function public.get_dm_trainer_drill(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_trainer_type is null or p_trainer_type not in ('venn-logic', 'data-logic', 'argument-judge') then
    raise exception 'Invalid trainer type';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          q.legacy_id,
        'dbId',        q.id,
        'trainerType', q.trainer_type,
        'difficulty',  q.difficulty,
        'stem',        q.stem,
        'question',    q.content->>'question',
        'options',     case
          when jsonb_typeof(q.content->'optionsList') = 'array' then q.content->'optionsList'
          else jsonb_build_array(
            jsonb_build_object('id', 'A', 'text', q.content->'options'->>'A'),
            jsonb_build_object('id', 'B', 'text', q.content->'options'->>'B'),
            jsonb_build_object('id', 'C', 'text', q.content->'options'->>'C'),
            jsonb_build_object('id', 'D', 'text', q.content->'options'->>'D')
          )
        end,
        'correctAnswer',        q.content->>'correctAnswer',
        'explanation',          q.explanation,
        'skillTag',             q.skill_tag,
        'commonTrap',           coalesce(q.content->>'commonTrap', ''),
        'optionalWorkingSteps', q.content->'workingSteps',
        'generalRule',          q.content->>'generalRule',
        'wrongOptionReasons',   q.content->'wrongOptionReasons',
        'keyInsight',           q.content->>'keyInsight',
        'review',               case
          when q.content ? 'review' and jsonb_typeof(q.content->'review') = 'object'
            then q.content->'review'
          else jsonb_build_object(
            'ambiguityRisk', 'low',
            'whySafeToInclude', 'Active question from trainer_questions'
          )
        end
      )
      order by q.legacy_id
    ),
    '[]'::jsonb
  )
  into result
  from public.trainer_questions q
  where q.trainer_type = p_trainer_type
    and q.status = 'active';

  return result;
end;
$$;

comment on function public.get_dm_trainer_drill(text) is
  'Returns active DM questions with full content fields (generalRule, wrongOptionReasons, keyInsight, review, option labels).';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;

-- QR conversions: serve active questions from trainer_questions when present.

create or replace function public.get_qr_conversion_drill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          q.legacy_id,
        'category',    coalesce(q.content->>'category', q.skill_tag),
        'prompt',      coalesce(q.content->>'question', q.stem),
        'answer',      (q.content->>'correctAnswer')::numeric,
        'answerLabel', coalesce(q.content->>'units', ''),
        'explanation', coalesce(
          q.content->'explanation',
          jsonb_build_object(
            'method', jsonb_build_object(
              'target', '',
              'convert', '',
              'calculate', coalesce(q.content->>'workedSolution', q.explanation, '')
            ),
            'examShortcut', coalesce(q.content->>'workedSolution', q.explanation, ''),
            'senseCheck', '',
            'commonTrap', coalesce(q.content->>'commonTrap', '')
          )
        )
      )
      order by q.legacy_id
    ),
    '[]'::jsonb
  )
  into result
  from public.trainer_questions q
  where q.trainer_type = 'qr-conversions'
    and q.status = 'active';

  return result;
end;
$$;

comment on function public.get_qr_conversion_drill() is
  'Returns active QR conversion questions from trainer_questions.';

grant execute on function public.get_qr_conversion_drill() to anon, authenticated;


-- ========== 20260520180000_admin_send_to_review_queue.sql ==========
-- Return an active question to the review queue (draft + needs_review).

create or replace function public.admin_send_question_to_review_queue(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  src public.trainer_questions;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into src
  from public.trainer_questions
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if src.status <> 'active' then
    raise exception 'Only active questions can be sent to the review queue (current status: %)', src.status;
  end if;

  update public.trainer_questions
  set
    status         = 'draft',
    quality_status = 'needs_review',
    quality_notes  = trim(both from coalesce(quality_notes, '') || E'\nReturned to review queue.'),
    updated_by     = auth.uid()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'status', 'draft',
    'quality_status', 'needs_review'
  );
end;
$$;

comment on function public.admin_send_question_to_review_queue(uuid) is
  'Unpublish an active question: status draft, quality needs_review. Students no longer see it until re-activated.';

grant execute on function public.admin_send_question_to_review_queue(uuid)
  to authenticated;


-- ========== 20260520190000_admin_update_trainer_question.sql ==========
-- Allow admin copy edits: full fields on drafts, explanation-only on active.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.content       is distinct from old.content       or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit content fields on an active question (id: %). '
        'Duplicate as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks structural edits on active questions. Explanation text may still be patched via admin_update_trainer_question.';

create or replace function public.admin_update_trainer_question(
  p_id uuid,
  p_stem text default null,
  p_explanation text default null,
  p_question text default null,
  p_options jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  row public.trainer_questions;
  merged jsonb;
  opt_key text;
  opt_text text;
  opt_list jsonb := '[]'::jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into row
  from public.trainer_questions
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if row.status = 'archived' then
    raise exception 'Cannot edit archived questions. Re-activate or duplicate as draft first.';
  end if;

  if row.status = 'active' then
    if p_stem is not null or p_question is not null or p_options is not null then
      raise exception 'Active questions: only explanation can be edited. Use Duplicate as Draft for other changes.';
    end if;
    if p_explanation is null then
      raise exception 'Nothing to save';
    end if;

    update public.trainer_questions
    set
      explanation = p_explanation,
      updated_by  = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'explanation_only');
  end if;

  -- draft (and any non-active non-archived): merge content fields
  merged := row.content;

  if p_question is not null then
    merged := jsonb_set(merged, '{question}', to_jsonb(p_question), true);
  end if;

  if p_options is not null and jsonb_typeof(p_options) = 'object' then
    merged := jsonb_set(merged, '{options}', p_options, true);
    for opt_key in select unnest(array['A', 'B', 'C', 'D']) loop
      opt_text := p_options ->> opt_key;
      if opt_text is not null then
        opt_list := opt_list || jsonb_build_array(
          jsonb_build_object('id', opt_key, 'text', opt_text)
        );
      end if;
    end loop;
    if jsonb_array_length(opt_list) = 4 then
      merged := jsonb_set(merged, '{optionsList}', opt_list, true);
    end if;
  end if;

  update public.trainer_questions
  set
    stem          = coalesce(p_stem, stem),
    explanation   = coalesce(p_explanation, explanation),
    content       = merged,
    updated_by    = auth.uid()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'draft');
end;
$$;

comment on function public.admin_update_trainer_question(uuid, text, text, text, jsonb) is
  'Admin copy edit. Drafts: stem, explanation, question, options. Active: explanation only.';

grant execute on function public.admin_update_trainer_question(uuid, text, text, text, jsonb)
  to authenticated;


-- ========== 20260520200000_question_lab_legacy_and_full_edit.sql ==========
-- Fix legacy_id on activate replacement; expand admin edit for all trainers + teaching fields.

drop function if exists public.admin_update_trainer_question(uuid, text, text, text, jsonb);

create or replace function public.admin_update_question_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  v_replaces uuid;
  v_legacy text;
  v_row_legacy text;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_status = 'active' then
    select replaces_question_id, legacy_id
    into v_replaces, v_row_legacy
    from public.trainer_questions
    where id = p_id;

    if not found then
      raise exception 'Question not found: %', p_id;
    end if;

    v_legacy := v_row_legacy;
    if v_legacy is null and v_replaces is not null then
      select legacy_id into v_legacy
      from public.trainer_questions
      where id = v_replaces;
    end if;

    if v_replaces is not null then
      update public.trainer_questions
      set status = 'archived', legacy_id = null
      where id = v_replaces and status = 'active';
    end if;

    update public.trainer_questions
    set
      status     = 'active',
      legacy_id  = v_legacy,
      updated_by = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'status', 'active', 'legacy_id', v_legacy);
  end if;

  update public.trainer_questions
  set status = p_status, updated_by = auth.uid()
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

create or replace function public.admin_update_trainer_question(
  p_id uuid,
  p_stem text default null,
  p_explanation text default null,
  p_question text default null,
  p_options jsonb default null,
  p_content_patch jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  row public.trainer_questions;
  merged jsonb;
  patch_key text;
  allowed_active text[] := array[
    'generalRule', 'keyInsight', 'wrongOptionReasons', 'review',
    'pivotInsight', 'explanation', 'workedSolution', 'commonTrap', 'workingSteps'
  ];
  opt_key text;
  opt_text text;
  opt_list jsonb := '[]'::jsonb;
  is_allowed boolean;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into row from public.trainer_questions where id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if row.status = 'archived' then
    raise exception 'Cannot edit archived questions. Re-activate or duplicate as draft first.';
  end if;

  merged := row.content;

  if row.status = 'active' then
    if p_stem is not null or p_question is not null or p_options is not null then
      raise exception 'Active questions: edit explanation and teaching fields only. Use Send to review queue for full edits.';
    end if;

    if p_content_patch is not null and jsonb_typeof(p_content_patch) = 'object' then
      for patch_key in select jsonb_object_keys(p_content_patch) loop
        select patch_key = any(allowed_active) into is_allowed;
        if not is_allowed then
          raise exception 'Cannot patch "%" on an active question', patch_key;
        end if;
        merged := jsonb_set(merged, array[patch_key], p_content_patch->patch_key, true);
      end loop;
    end if;

    update public.trainer_questions
    set
      explanation  = coalesce(p_explanation, explanation),
      content      = merged,
      updated_by   = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'active_teaching');
  end if;

  -- draft: full merge
  if p_question is not null then
    merged := jsonb_set(merged, '{question}', to_jsonb(p_question), true);
  end if;

  if p_options is not null and jsonb_typeof(p_options) = 'object' then
    merged := jsonb_set(merged, '{options}', p_options, true);
    for opt_key in select unnest(array['A', 'B', 'C', 'D']) loop
      opt_text := p_options ->> opt_key;
      if opt_text is not null then
        opt_list := opt_list || jsonb_build_array(
          jsonb_build_object('id', opt_key, 'text', opt_text)
        );
      end if;
    end loop;
    if jsonb_array_length(opt_list) = 4 then
      merged := jsonb_set(merged, '{optionsList}', opt_list, true);
    end if;
  end if;

  if p_content_patch is not null and jsonb_typeof(p_content_patch) = 'object' then
    for patch_key in select jsonb_object_keys(p_content_patch) loop
      merged := jsonb_set(merged, array[patch_key], p_content_patch->patch_key, true);
    end loop;
  end if;

  update public.trainer_questions
  set
    stem          = coalesce(p_stem, stem),
    explanation   = coalesce(p_explanation, explanation),
    content       = merged,
    updated_by    = auth.uid()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'draft');
end;
$$;

comment on function public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb) is
  'Admin copy edit. Draft: full fields + content patch. Active: explanation + teaching content patch only.';

grant execute on function public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb)
  to authenticated;


-- ========== 20260520210000_allow_active_teaching_edits.sql ==========
-- Allow admin RPC to patch explanation and teaching content on active questions.
-- PostgREST must reload after function signature changes.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit structural fields on an active question (id: %). '
        'Duplicate as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks stem, media, difficulty, skill_tag, trainer_type, question_kind on active rows. '
  'Explanation and content teaching patches go through admin_update_trainer_question.';

notify pgrst, 'reload schema';


-- ========== 20260520220000_admin_delete_trainer_question.sql ==========
-- Permanently remove draft or archived questions (admin only).

create or replace function public.admin_delete_trainer_question(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  row public.trainer_questions;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into row from public.trainer_questions where id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if row.status = 'active' then
    raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
  end if;

  update public.trainer_questions
  set replaces_question_id = null
  where replaces_question_id = p_id;

  delete from public.trainer_question_attempts where question_id = p_id;
  delete from public.question_reports where trainer_question_id = p_id;
  delete from public.question_reviews where trainer_question_id = p_id;

  delete from public.trainer_questions where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'legacy_id', row.legacy_id);
end;
$$;

comment on function public.admin_delete_trainer_question(uuid) is
  'Permanently deletes a draft or archived question and related reports, reviews, and attempts.';

grant execute on function public.admin_delete_trainer_question(uuid) to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260520230000_admin_bulk_delete_trainer_questions.sql ==========
-- Bulk delete draft/archived questions (admin only).

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  id uuid;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
  one jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach id in array p_ids loop
    begin
      one := public.admin_delete_trainer_question(id);
      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260520240000_fix_admin_bulk_delete_ambiguous_id.sql ==========
-- Fix ambiguous "id" in bulk delete: loop variable shadowed profiles.id in admin check.

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  question_id uuid;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
  one jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach question_id in array p_ids loop
    begin
      one := public.admin_delete_trainer_question(question_id);
      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', question_id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260520250000_admin_bulk_delete_inline.sql ==========
-- Inline bulk delete logic (no nested RPC calls) and qualify column references.

create or replace function public.admin_delete_trainer_question(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  qrow public.trainer_questions;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into qrow from public.trainer_questions where trainer_questions.id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if qrow.status = 'active' then
    raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
  end if;

  update public.trainer_questions
  set replaces_question_id = null
  where replaces_question_id = p_id;

  delete from public.trainer_question_attempts where question_id = p_id;
  delete from public.question_reports where trainer_question_id = p_id;
  delete from public.question_reviews where trainer_question_id = p_id;

  delete from public.trainer_questions where trainer_questions.id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'legacy_id', qrow.legacy_id);
end;
$$;

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  question_id uuid;
  qrow public.trainer_questions;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach question_id in array p_ids loop
    begin
      select * into qrow
      from public.trainer_questions
      where trainer_questions.id = question_id;

      if not found then
        raise exception 'Question not found: %', question_id;
      end if;

      if qrow.status = 'active' then
        raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
      end if;

      update public.trainer_questions
      set replaces_question_id = null
      where replaces_question_id = question_id;

      delete from public.trainer_question_attempts where question_id = question_id;
      delete from public.question_reports where trainer_question_id = question_id;
      delete from public.question_reviews where trainer_question_id = question_id;
      delete from public.trainer_questions where trainer_questions.id = question_id;

      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', question_id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_question(uuid) is
  'Permanently deletes a draft or archived question and related reports, reviews, and attempts.';

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_question(uuid) to authenticated;
grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260520260000_fix_bulk_delete_ambiguous_question_id.sql ==========
-- Fix ambiguous question_id: loop variable shadowed trainer_question_attempts.question_id.

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  target_id uuid;
  qrow public.trainer_questions;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach target_id in array p_ids loop
    begin
      select * into qrow
      from public.trainer_questions
      where trainer_questions.id = target_id;

      if not found then
        raise exception 'Question not found: %', target_id;
      end if;

      if qrow.status = 'active' then
        raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
      end if;

      update public.trainer_questions
      set replaces_question_id = null
      where replaces_question_id = target_id;

      delete from public.trainer_question_attempts tqa
      where tqa.question_id = target_id;
      delete from public.question_reports qr
      where qr.trainer_question_id = target_id;
      delete from public.question_reviews qrev
      where qrev.trainer_question_id = target_id;
      delete from public.trainer_questions tq
      where tq.id = target_id;

      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', target_id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';


-- ========== 20260521090000_admin_registrations_per_person_usage.sql ==========
-- Extend admin registrations overview with subject, entry year, and per-trainer
-- questions/time for per-person usage on the admin dashboard.

create or replace function public.get_admin_registrations_overview(limit_rows int default 5000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  with profiles_base as (
    select
      id,
      created_at,
      full_name,
      first_name,
      last_name,
      email,
      stream,
      entry_year
    from public.profiles
    order by created_at desc nulls last
    limit coalesce(limit_rows, 5000)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0) as total_session_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'speed_reading'), 0) as speed_reading_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'speed_reading'), 0) as speed_reading_time_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'rapid_recall'), 0) as rapid_recall_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'rapid_recall'), 0) as rapid_recall_time_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'keyword_scanning'), 0) as keyword_scanning_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'keyword_scanning'), 0) as keyword_scanning_time_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'calculator'), 0) as calculator_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'calculator'), 0) as calculator_time_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'inference_trainer'), 0) as inference_trainer_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'inference_trainer'), 0) as inference_trainer_time_seconds,
      coalesce(sum(s.total) filter (where s.training_type = 'mental_maths'), 0) as mental_maths_questions,
      coalesce(sum(coalesce(s.time_seconds, 0)) filter (where s.training_type = 'mental_maths'), 0) as mental_maths_time_seconds,
      (array_agg(s.wpm order by s.created_at desc) filter (where s.training_type = 'speed_reading' and s.wpm is not null))[1] as last_wpm,
      avg(s.wpm) filter (where s.training_type = 'speed_reading' and s.wpm is not null) as avg_wpm,
      max(s.created_at) as last_sess
    from public.sessions s
    where s.user_id in (select id from profiles_base)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) as syllogism_seconds,
      coalesce(sum(total_questions) filter (where mode = 'micro'), 0) as syllogism_micro_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint) filter (where mode = 'micro'), 0) as syllogism_micro_time_seconds,
      coalesce(sum(total_questions) filter (where mode = 'macro'), 0) as syllogism_macro_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint) filter (where mode = 'macro'), 0) as syllogism_macro_time_seconds,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where user_id in (select id from profiles_base)
    group by user_id
  ),
  user_days as (
    select user_id, count(distinct d)::int as days_active
    from (
      select user_id, date(created_at) as d
      from public.sessions
      where user_id in (select id from profiles_base)
      union
      select user_id, date(created_at) as d
      from public.syllogism_sessions
      where user_id in (select id from profiles_base)
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'email', coalesce(trim(p.email), ''),
      'display_name', coalesce(
        nullif(trim(p.full_name), ''),
        nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' ')
      , ''),
      'stream', p.stream,
      'entry_year', p.entry_year,
      'created_at', p.created_at,
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'trainer_questions', jsonb_build_object(
        'speed_reading', coalesce(us.speed_reading_questions, 0),
        'rapid_recall', coalesce(us.rapid_recall_questions, 0),
        'keyword_scanning', coalesce(us.keyword_scanning_questions, 0),
        'calculator', coalesce(us.calculator_questions, 0),
        'inference_trainer', coalesce(us.inference_trainer_questions, 0),
        'mental_maths', coalesce(us.mental_maths_questions, 0),
        'syllogism_micro', coalesce(sy.syllogism_micro_questions, 0),
        'syllogism_macro', coalesce(sy.syllogism_macro_questions, 0)
      ),
      'trainer_time_seconds', jsonb_build_object(
        'speed_reading', coalesce(us.speed_reading_time_seconds, 0),
        'rapid_recall', coalesce(us.rapid_recall_time_seconds, 0),
        'keyword_scanning', coalesce(us.keyword_scanning_time_seconds, 0),
        'calculator', coalesce(us.calculator_time_seconds, 0),
        'inference_trainer', coalesce(us.inference_trainer_time_seconds, 0),
        'mental_maths', coalesce(us.mental_maths_time_seconds, 0),
        'syllogism_micro', coalesce(sy.syllogism_micro_time_seconds, 0),
        'syllogism_macro', coalesce(sy.syllogism_macro_time_seconds, 0)
      ),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by p.created_at desc nulls last
  ), '[]'::jsonb) into result
  from profiles_base p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_days ud on ud.user_id = p.id;

  return result;
end;
$$;

comment on function public.get_admin_registrations_overview(int) is
  'Returns all registrations with subject, per-trainer sessions/questions/time, and totals. Admin only.';


-- ========== 20260612090000_perf_hygiene_rls_initplan_indexes.sql ==========
-- Performance hygiene (Supabase advisor findings, June 2026)
--
-- 1) auth_rls_initplan: wrap auth.uid() in a scalar subselect so Postgres
--    evaluates it once per statement instead of once per row.
-- 2) unindexed_foreign_keys: cover trainer_questions.replaces_question_id.
-- 3) unused_index: drop indexes with no equality-filter query pattern anywhere
--    in the app or admin RPCs. FK-cover indexes and indexes backing admin RPC
--    filters (idx_tq_section, idx_tq_difficulty, invite/pending lookups, etc.)
--    are deliberately kept even though the advisor flags them as unused - the
--    database is young and they exist for correctness/scale reasons.

-- ── 1) RLS initplan fixes ─────────────────────────────────────────────────────

alter policy "Users can log their own attempts"
  on public.trainer_question_attempts
  with check (user_id = (select auth.uid()));

alter policy "Users can read their own attempts"
  on public.trainer_question_attempts
  using (user_id = (select auth.uid()));

alter policy "Users can read their own reports"
  on public.question_reports
  using (user_id = (select auth.uid()));

alter policy "Users can submit reports"
  on public.question_reports
  with check (user_id = (select auth.uid()));

-- ── 2) Missing FK cover index ─────────────────────────────────────────────────

create index if not exists trainer_questions_replaces_question_id_idx
  on public.trainer_questions (replaces_question_id);

-- ── 3) Redundant unused indexes ───────────────────────────────────────────────
-- skill_tag is only ever searched with ilike '%…%' (btree cannot help), and no
-- query filters attempts by trainer_type/created_at or reviews by status alone.

drop index if exists public.idx_tq_skill_tag;
drop index if exists public.idx_tqa_skill_tag;
drop index if exists public.idx_tqa_trainer_type;
drop index if exists public.idx_tqa_created_at;
drop index if exists public.idx_qrev_status;


-- ========== 20260612100000_atomic_plan_regeneration_rpc.sql ==========
-- Atomic plan regeneration.
--
-- regenerateFutureWeeks previously issued ~6 sequential statements from the browser
-- (delete sessions, delete days, delete weeks, insert weeks, insert days, insert
-- sessions). A network drop or crash mid-sequence left the plan corrupted - old weeks
-- deleted, new ones never written. This RPC performs the whole swap in one
-- transaction and one round trip.
--
-- SECURITY INVOKER: every statement still runs as the calling user, so the existing
-- RLS policies on plan_weeks/plan_days/plan_sessions keep enforcing plan ownership.
-- plan_id on inserted rows is forced to p_plan_id so a malformed payload can never
-- write into another plan even before RLS is consulted.

create or replace function public.apply_plan_regeneration(
  p_plan_id uuid,
  p_dates_to_clear date[],
  p_week_ids_to_delete uuid[],
  p_new_weeks jsonb default '[]'::jsonb,
  p_new_days jsonb default '[]'::jsonb,
  p_new_sessions jsonb default '[]'::jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_dates_to_clear is not null and array_length(p_dates_to_clear, 1) > 0 then
    delete from plan_sessions where plan_id = p_plan_id and day_date = any(p_dates_to_clear);
    delete from plan_days     where plan_id = p_plan_id and day_date = any(p_dates_to_clear);
  end if;

  if p_week_ids_to_delete is not null and array_length(p_week_ids_to_delete, 1) > 0 then
    delete from plan_weeks where plan_id = p_plan_id and id = any(p_week_ids_to_delete);
  end if;

  insert into plan_weeks
    (id, plan_id, week_number, week_start, week_type, default_hours, difficulty_rating, is_locked, tutor_note)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'week_number')::int,
    (r->>'week_start')::date,
    coalesce(r->>'week_type', 'school'),
    coalesce((r->>'default_hours')::numeric, 2.0),
    (r->>'difficulty_rating')::smallint,
    coalesce((r->>'is_locked')::boolean, false),
    r->>'tutor_note'
  from jsonb_array_elements(coalesce(p_new_weeks, '[]'::jsonb)) r;

  insert into plan_days
    (id, plan_id, plan_week_id, day_date, availability, custom_hours, is_rest)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'plan_week_id')::uuid,
    (r->>'day_date')::date,
    coalesce(r->>'availability', 'available'),
    (r->>'custom_hours')::numeric,
    coalesce((r->>'is_rest')::boolean, false)
  from jsonb_array_elements(coalesce(p_new_days, '[]'::jsonb)) r;

  insert into plan_sessions
    (id, plan_id, plan_day_id, day_date, session_type, duration_minutes, position, is_timed, notes, planner_rationale)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'plan_day_id')::uuid,
    (r->>'day_date')::date,
    r->>'session_type',
    coalesce((r->>'duration_minutes')::int, 60),
    coalesce((r->>'position')::int, 0),
    coalesce((r->>'is_timed')::boolean, false),
    r->>'notes',
    r->>'planner_rationale'
  from jsonb_array_elements(coalesce(p_new_sessions, '[]'::jsonb)) r;
end;
$$;

revoke all on function public.apply_plan_regeneration(uuid, date[], uuid[], jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.apply_plan_regeneration(uuid, date[], uuid[], jsonb, jsonb, jsonb) to authenticated, service_role;


-- ========== 20260612110000_anon_analytics_inserts.sql ==========
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


-- ========== 20260612120000_allow_unit_conversions_sessions.sql ==========
-- Fix: Conversions trainer sessions were silently lost.
--
-- The client logs training_type 'unit_conversions' (src/utils/analyticsStorage.ts
-- saveConversionSession, src/types/session.ts, guestSessions.ts) but
-- sessions_training_type_check never included it, so every signed-in save failed
-- the check constraint (0 rows ever, vs 989 sessions across the 6 allowed types).
-- Worse, one guest unit_conversions row made the entire guest-history batch insert
-- fail on sign-in ("Couldn't sync your guest history").

alter table public.sessions
  drop constraint sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text
  ]));


-- ========== 20260612130000_session_dedup_and_metric_columns.sql ==========
-- Session logging integrity (trainer audit, June 2026)
--
-- 1) client_session_id: trainers save from several paths (auto-save, manual save,
--    pagehide) and ~25% of speed-reading rows were near-duplicate twins. Clients now
--    send a per-drill uuid and upsert on (user_id, client_session_id), so retries and
--    duplicate code paths update one row instead of inserting twins. Legacy rows keep
--    NULL (NULLS DISTINCT, so the unique index ignores them).
-- 2) kps / avg_ms: the wpm column was triple-purposed (speed reading wpm, calculator
--    keystrokes-per-second, mental maths avg ms per question), which made aggregate
--    charts mix units. Each metric now has its own column; old rows are backfilled.

alter table public.sessions add column if not exists client_session_id uuid;
alter table public.sessions add column if not exists kps numeric;
alter table public.sessions add column if not exists avg_ms integer;

create unique index if not exists sessions_user_client_session_uidx
  on public.sessions (user_id, client_session_id);

-- Backfill repurposed wpm values into their own columns.
update public.sessions set kps = wpm, wpm = null
  where training_type = 'calculator' and wpm is not null;
update public.sessions set avg_ms = wpm, wpm = null
  where training_type = 'mental_maths' and wpm is not null;


-- ========== 20260612140000_vr_passage_sets_and_not_except.sql ==========
-- VR bank growth support (June 2026)
--
-- 1) get_vr_passage_sets: serve active question-lab VR passage sets (trainer_type
--    'vr-passages') to the trainers. SECURITY DEFINER like get_dm_trainer_drill so
--    guests can read active content without a broad RLS policy on trainer_questions.
-- 2) sessions_training_type_check: allow 'not_except' for the new NOT/EXCEPT drill
--    (constraint must be extended BEFORE the trainer ships or its saves are
--    silently rejected, as happened with unit_conversions).

create or replace function public.get_vr_passage_sets()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'difficulty', q.difficulty,
        'skillTag', q.skill_tag,
        'title', q.content->>'title',
        'category', q.content->>'category',
        'passage', q.content->>'passage',
        'questions', q.content->'questions'
      )
      order by q.created_at
    ),
    '[]'::jsonb
  )
  from trainer_questions q
  where q.trainer_type = 'vr-passages' and q.status = 'active';
$$;

revoke all on function public.get_vr_passage_sets() from public;
grant execute on function public.get_vr_passage_sets() to anon, authenticated, service_role;

alter table public.sessions
  drop constraint sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text,
    'not_except'::text
  ]));


-- ========== 20260614120000_security_hardening_grants_searchpath.sql ==========
-- Security hardening (advisor follow-up, June 2026)
--
-- No active vulnerability: every admin_* function already self-checks is_admin and
-- raises for non-admins. This is defence in depth, removing capability that no
-- legitimate caller needs.
--
-- 1) Revoke anon execute on admin-only RPCs. The admin UI calls these as an
--    authenticated admin, so `authenticated` keeps execute; anonymous visitors
--    have no business reaching them at all.
-- 2) Trigger functions should carry no direct execute grant - they fire from
--    triggers regardless. Revoke from everyone.
-- 3) Pin search_path on the two trigger functions flagged as mutable.

revoke execute on function
  public.admin_delete_trainer_question(uuid),
  public.admin_delete_trainer_questions(uuid[]),
  public.admin_duplicate_question_as_draft(uuid),
  public.admin_get_question_coverage(),
  public.admin_get_question_reports(text, integer, integer),
  public.admin_get_trainer_questions(text, text, text, text, text, boolean, text, integer, integer),
  public.admin_import_trainer_question_drafts(jsonb),
  public.admin_send_question_to_review_queue(uuid),
  public.admin_update_question_status(uuid, text),
  public.admin_update_report_status(uuid, text),
  public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb)
from anon;

revoke execute on function
  public.apply_review_quality_status(),
  public.increment_question_flag_count()
from anon, authenticated, public;

alter function public.set_updated_at() set search_path = public;
alter function public.prevent_active_question_edit() set search_path = public;


-- ========== 20260614130000_security_hardening_admin_grants_fix.sql ==========
-- Follow-up to 20260614120000: admin_* functions inherit EXECUTE from PUBLIC, so
-- revoking `anon` alone was a no-op. Revoke from PUBLIC (and anon) and re-grant only
-- `authenticated` - the functions still self-check is_admin, so a non-admin
-- authenticated caller is rejected; anonymous callers can no longer reach them.

do $$
declare fn text;
begin
  for fn in
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end$$;


-- ========== 20260617120000_weekly_summary_emails.sql ==========
-- Weekly study-summary emails (Resend + pg_cron).
--
-- Adds an unsubscribe token + suppression flag to profiles, a per-week send log
-- (idempotency), an aggregate RPC for each user's weekly stats, and a pg_cron job
-- that invokes the `send-weekly-summaries` edge function via pg_net.
--
-- Consent model: summaries are sent to ALL signed-in users as a service email
-- (about their own account activity), honouring a dedicated one-click unsubscribe
-- (`weekly_summary_opt_out`) that is independent of the Mailchimp marketing opt-in.
--
-- Operator setup (one-time; values are NOT stored in the repo):
--   supabase secrets set RESEND_API_KEY=...              -- edge function
--   supabase secrets set WEEKLY_SUMMARY_CRON_SECRET=...  -- edge function
--   -- Vault secrets read by the cron job (run in the SQL editor):
--   select vault.create_secret('https://<ref>.supabase.co', 'weekly_summary_base_url');
--   select vault.create_secret('<anon-key>',                 'weekly_summary_anon_key');
--   select vault.create_secret('<cron-secret>',              'weekly_summary_cron_secret'); -- same value as WEEKLY_SUMMARY_CRON_SECRET

alter table public.profiles
  add column if not exists weekly_summary_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

create table if not exists public.weekly_summary_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  unique (user_id, week_start)
);

alter table public.weekly_summary_log enable row level security;
-- No RLS policies: only service_role (used by the edge function) bypasses RLS.
revoke all on public.weekly_summary_log from anon, authenticated;

comment on table public.weekly_summary_log is
  'One row per user per ISO week the weekly summary was processed; enforces idempotency.';

-- Per-user weekly activity aggregate across every trainer session table, plus plan
-- adherence. SECURITY DEFINER so it can read auth.users email and bypass RLS; locked
-- to service_role only.
create or replace function public.weekly_summary_data(p_week_start date, p_week_end date)
returns table (
  user_id uuid,
  email text,
  first_name text,
  unsubscribe_token uuid,
  sessions_count bigint,
  correct_sum numeric,
  total_sum numeric,
  study_seconds bigint,
  active_days bigint,
  planned_sessions bigint,
  completed_sessions bigint
)
language sql
security definer
set search_path = public, auth, pg_catalog
as $$
  with activity as (
    -- VR/QR trainers: correct/total scored, timed.
    select user_id, created_at,
           correct::numeric as correct_pts,
           total::numeric as total_pts,
           coalesce(time_seconds, 0) as study_seconds
    from public.sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
    union all
    -- SJT trainer: point-scored (half marks), not timed.
    select user_id, created_at, score, max_score, 0
    from public.sjt_sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
    union all
    -- DM trainer: correct count out of total_questions, timed.
    select user_id, created_at,
           score::numeric, total_questions::numeric, elapsed_seconds
    from public.dm_trainer_sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
  ),
  agg as (
    select user_id,
           count(*) as sessions_count,
           sum(correct_pts) as correct_sum,
           sum(total_pts) as total_sum,
           sum(study_seconds)::bigint as study_seconds,
           count(distinct ((created_at at time zone 'Europe/London')::date)) as active_days
    from activity
    group by user_id
  ),
  active_plan as (
    select distinct on (student_id) student_id as user_id, id as plan_id
    from public.plans
    where status = 'active'
    order by student_id, created_at desc
  ),
  planned as (
    select ap.user_id,
           count(*) filter (where t.session_type <> 'rest') as planned_sessions,
           count(*) filter (
             where t.session_type <> 'rest' and c.session_id is not null
           ) as completed_sessions
    from active_plan ap
    join public.plan_sessions t
      on t.plan_id = ap.plan_id
     and t.day_date >= p_week_start
     and t.day_date <= p_week_end
    left join public.session_completions c
      on c.session_id = t.id and c.student_id = ap.user_id
    group by ap.user_id
  ),
  base as (
    select user_id from agg
    union
    select user_id from active_plan
  )
  select b.user_id,
         u.email::text,
         pr.first_name,
         pr.unsubscribe_token,
         coalesce(a.sessions_count, 0),
         coalesce(a.correct_sum, 0),
         coalesce(a.total_sum, 0),
         coalesce(a.study_seconds, 0),
         coalesce(a.active_days, 0),
         coalesce(pl.planned_sessions, 0),
         coalesce(pl.completed_sessions, 0)
  from base b
  join auth.users u on u.id = b.user_id
  left join public.profiles pr on pr.id = b.user_id
  left join agg a on a.user_id = b.user_id
  left join planned pl on pl.user_id = b.user_id
  where u.email is not null
    and coalesce(pr.weekly_summary_opt_out, false) = false;
$$;

revoke all on function public.weekly_summary_data(date, date) from public, anon, authenticated;
grant execute on function public.weekly_summary_data(date, date) to service_role;

-- ── Schedule ────────────────────────────────────────────────────────────────
-- pg_cron runs in UTC. 17:00 UTC = 18:00 BST / 17:00 GMT on Sundays. The edge
-- function summarises the Mon–Sun week that ends on the run day.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this migration replaces the schedule rather than duplicating it.
select cron.unschedule(jobid) from cron.job where jobname = 'weekly-study-summary';

select cron.schedule(
  'weekly-study-summary',
  '0 17 * * 0',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'weekly_summary_base_url')
           || '/functions/v1/send-weekly-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                      where name = 'weekly_summary_anon_key')
    ),
    body := jsonb_build_object(
      'secret', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'weekly_summary_cron_secret')
    )
  );
  $cron$
);


-- ========== 20260625120000_question_overrides.sql ==========
-- Admin-managed overrides for flagged questions.
--
-- Lets an admin (a) soft-hide a question so trainers stop serving it, and
-- (b) edit a question's content live without a redeploy. Keyed by the same
-- question_identifier string stored in question_feedback, normalised so that
-- SJT item-level and distortion index-level flags collapse to a stable key:
--   dm_trainer:<id> | inference:<passageId>:<qid> | syllogism:<id>
--   sjt:<questionId>            (item suffix dropped — hide/edit at question level)
--   distortion-passage:<passageId>  (distortion items are generated; hide whole passage)
--
-- The `override` JSON holds only the changed fields; its shape depends on the
-- trainer kind and is merged on top of the resolved question client-side.

create table if not exists public.question_overrides (
  question_identifier text primary key,
  question_kind text,
  trainer_type text,
  is_hidden boolean not null default false,
  override jsonb,
  note text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.question_overrides is
  'Admin overrides for flagged questions: soft-hide flag plus field-level content edits, keyed by normalised question_identifier.';

-- RLS: everyone (incl. logged-out students) may READ so trainers can filter
-- hidden questions and apply edits. Only admins may write.
alter table public.question_overrides enable row level security;

drop policy if exists "Anyone can read question overrides" on public.question_overrides;
create policy "Anyone can read question overrides"
  on public.question_overrides for select
  to authenticated, anon
  using (true);

drop policy if exists "Admins can manage question overrides" on public.question_overrides;
create policy "Admins can manage question overrides"
  on public.question_overrides for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Fix latent bug: question_feedback had no DELETE policy, so the admin
-- "Dismiss all" button failed silently under RLS. Allow admins to delete.
drop policy if exists "Admins can delete question feedback" on public.question_feedback;
create policy "Admins can delete question feedback"
  on public.question_feedback for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

notify pgrst, 'reload schema';

