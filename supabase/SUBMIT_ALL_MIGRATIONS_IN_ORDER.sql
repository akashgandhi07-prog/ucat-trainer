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

-- 2) get_analytics_summary(since_ts, until_ts) — admin-only aggregated analytics
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
  if meta_role in ('student', 'tutor') then pr := meta_role; end if;

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
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );

drop policy if exists "plan_members: update" on public.plan_members;
create policy "plan_members: update" on public.plan_members
  for update
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );

drop policy if exists "plan_members: delete" on public.plan_members;
create policy "plan_members: delete" on public.plan_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
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
  'Config for Mailchimp signup webhook: edge_function_url and webhook_secret. RLS on; no policies for API roles — reads only from trigger (definer/owner).';


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
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
    )
  );


drop policy if exists "plan_members: delete" on public.plan_members;
create policy "plan_members: delete" on public.plan_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.plans p
      where p.id = plan_members.plan_id and p.tutor_id = (select auth.uid())
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

