-- =============================================================================
-- UCAT Trainer — Complete Supabase Schema
-- =============================================================================
-- Paste this ENTIRE file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run multiple times: uses IF NOT EXISTS / DROP IF EXISTS everywhere.
-- Does NOT delete existing data.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

-- Ensure ALL columns the app uses exist
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists stream text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists is_pro boolean default false;
alter table public.profiles add column if not exists daily_reads integer default 0;
alter table public.profiles add column if not exists entry_year text;
alter table public.profiles add column if not exists email_marketing_opt_in boolean default false;
alter table public.profiles add column if not exists email_marketing_opt_in_at timestamptz;
alter table public.profiles add column if not exists ucat_exam_date date;

-- UCAT exam window: April–September only (exam runs each year in this window)
alter table public.profiles drop constraint if exists profiles_ucat_exam_date_month_check;
alter table public.profiles add constraint profiles_ucat_exam_date_month_check
  check (ucat_exam_date is null or extract(month from ucat_exam_date) in (4, 5, 6, 7, 8, 9));

-- Stream constraint
alter table public.profiles drop constraint if exists profiles_stream_check;
alter table public.profiles add constraint profiles_stream_check
  check (stream is null or stream in ('Medicine', 'Dentistry', 'Veterinary Medicine', 'Other', 'Undecided'));

-- Length limits to prevent DoS and storage abuse
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

-- Back-fill any null roles
update public.profiles set role = 'user' where role is null;

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Drop legacy trigger (profile creation handled in app code)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

comment on table public.profiles is
  'User profile (display name, stream, role). Created/updated on first sign-in from the app.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  correct integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

-- Ensure ALL columns exist (handles tables created with a partial schema)
alter table public.sessions add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.sessions add column if not exists training_type text;
alter table public.sessions add column if not exists difficulty text;
alter table public.sessions add column if not exists wpm integer;
alter table public.sessions add column if not exists correct integer not null default 0;
alter table public.sessions add column if not exists total integer not null default 0;
alter table public.sessions add column if not exists created_at timestamptz not null default now();
alter table public.sessions add column if not exists passage_id text;
alter table public.sessions add column if not exists wpm_rating text;
alter table public.sessions add column if not exists time_seconds integer;

-- Back-fill training_type for any rows that pre-date the column
update public.sessions set training_type = 'speed_reading' where training_type is null;

-- Constraints (drop + re-add for idempotency — only AFTER columns exist)
alter table public.sessions drop constraint if exists sessions_training_type_check;
alter table public.sessions add constraint sessions_training_type_check
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning', 'calculator', 'inference_trainer', 'mental_maths'));

alter table public.sessions drop constraint if exists sessions_difficulty_check;
alter table public.sessions add constraint sessions_difficulty_check
  check (
    difficulty is null
    or difficulty in (
      'easy', 'medium', 'hard',               -- verbal drills
      'sprint', 'fingerTwister', 'memory',   -- calculator modes
      'stages', 'free',                      -- calculator modes
      'stage_1', 'stage_2', 'stage_3', 'stage_4'  -- mental maths
    )
  );

alter table public.sessions drop constraint if exists sessions_wpm_rating_check;
alter table public.sessions add constraint sessions_wpm_rating_check
  check (wpm_rating is null or wpm_rating in ('too_slow', 'slightly_slow', 'just_right', 'slightly_fast', 'too_fast'));

-- wpm must be nullable (rapid recall & keyword scanning don't have WPM)
alter table public.sessions alter column wpm drop not null;

-- Index for dashboard queries
create index if not exists sessions_user_id_created_at
  on public.sessions (user_id, created_at);

-- RLS
alter table public.sessions enable row level security;

drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

comment on table public.sessions is
  'Training sessions (speed_reading, rapid_recall, keyword_scanning, calculator, inference_trainer, mental_maths).';
comment on column public.sessions.time_seconds is
  'Duration in seconds (e.g. scan time for keyword_scanning, reading window for rapid_recall/inference_trainer, drill duration for calculator).';
comment on column public.sessions.difficulty is
  'Difficulty or mode label for the run (e.g. easy/medium/hard for verbal drills; sprint/fingerTwister/memory/stages/free for calculator).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) SYLLOGISM TRAINER (Decision Making)
-- ─────────────────────────────────────────────────────────────────────────────

-- Questions: programmatically generated syllogisms (shared stimulus via macro_block_id)
create table if not exists public.syllogism_questions (
  id uuid primary key default gen_random_uuid(),
  macro_block_id uuid default gen_random_uuid(),
  stimulus_text text not null,
  conclusion_text text not null,
  is_correct boolean not null,
  logic_group text not null,
  trick_type text not null,
  explanation text not null,
  created_at timestamptz default now()
);

-- Ensure ALL columns exist (idempotent with older partial schemas)
alter table public.syllogism_questions add column if not exists macro_block_id uuid default gen_random_uuid();
alter table public.syllogism_questions add column if not exists stimulus_text text not null;
alter table public.syllogism_questions add column if not exists conclusion_text text not null;
alter table public.syllogism_questions add column if not exists is_correct boolean not null;
alter table public.syllogism_questions add column if not exists logic_group text not null;
alter table public.syllogism_questions add column if not exists trick_type text not null;
alter table public.syllogism_questions add column if not exists explanation text not null;
alter table public.syllogism_questions add column if not exists created_at timestamptz default now();

-- Logic group constraint (categorical / relative / majority / complex)
alter table public.syllogism_questions drop constraint if exists syllogism_questions_logic_group_check;
alter table public.syllogism_questions add constraint syllogism_questions_logic_group_check
  check (logic_group in ('categorical', 'relative', 'majority', 'complex'));

-- RLS + policies: questions are publicly readable (no user data)
alter table public.syllogism_questions enable row level security;

drop policy if exists "Allow public read access to syllogism questions" on public.syllogism_questions;
create policy "Allow public read access to syllogism questions"
  on public.syllogism_questions for select
  using (true);

comment on table public.syllogism_questions is
  'Programmatically generated syllogism questions; macro_block_id groups five conclusions per stimulus for Macro Drill.';


-- Sessions: user performance on syllogism drills (micro + macro)
create table if not exists public.syllogism_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  score integer not null,
  total_questions integer not null,
  average_time_per_decision numeric not null,
  categorical_accuracy numeric,
  relative_accuracy numeric,
  majority_accuracy numeric,
  complex_accuracy numeric,
  created_at timestamptz default now()
);

-- Ensure ALL columns exist
alter table public.syllogism_sessions add column if not exists user_id uuid not null references auth.users (id) on delete cascade;
alter table public.syllogism_sessions add column if not exists mode text not null;
alter table public.syllogism_sessions add column if not exists score integer not null;
alter table public.syllogism_sessions add column if not exists total_questions integer not null;
alter table public.syllogism_sessions add column if not exists average_time_per_decision numeric not null;
alter table public.syllogism_sessions add column if not exists categorical_accuracy numeric;
alter table public.syllogism_sessions add column if not exists relative_accuracy numeric;
alter table public.syllogism_sessions add column if not exists majority_accuracy numeric;
alter table public.syllogism_sessions add column if not exists complex_accuracy numeric;
alter table public.syllogism_sessions add column if not exists created_at timestamptz default now();

-- Constraints
alter table public.syllogism_sessions drop constraint if exists syllogism_sessions_mode_check;
alter table public.syllogism_sessions add constraint syllogism_sessions_mode_check
  check (mode in ('micro', 'macro'));

alter table public.syllogism_sessions drop constraint if exists syllogism_sessions_categorical_accuracy_check;
alter table public.syllogism_sessions add constraint syllogism_sessions_categorical_accuracy_check
  check (categorical_accuracy is null or (categorical_accuracy >= 0 and categorical_accuracy <= 1));

alter table public.syllogism_sessions drop constraint if exists syllogism_sessions_relative_accuracy_check;
alter table public.syllogism_sessions add constraint syllogism_sessions_relative_accuracy_check
  check (relative_accuracy is null or (relative_accuracy >= 0 and relative_accuracy <= 1));

alter table public.syllogism_sessions drop constraint if exists syllogism_sessions_majority_accuracy_check;
alter table public.syllogism_sessions add constraint syllogism_sessions_majority_accuracy_check
  check (majority_accuracy is null or (majority_accuracy >= 0 and majority_accuracy <= 1));

alter table public.syllogism_sessions drop constraint if exists syllogism_sessions_complex_accuracy_check;
alter table public.syllogism_sessions add constraint syllogism_sessions_complex_accuracy_check
  check (complex_accuracy is null or (complex_accuracy >= 0 and complex_accuracy <= 1));

-- Index for dashboard and analytics queries
create index if not exists syllogism_sessions_user_id_created_at
  on public.syllogism_sessions (user_id, created_at);

-- RLS + policies: per-user insert/read
alter table public.syllogism_sessions enable row level security;

drop policy if exists "Users can insert their own syllogism sessions" on public.syllogism_sessions;
create policy "Users can insert their own syllogism sessions"
  on public.syllogism_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own syllogism sessions" on public.syllogism_sessions;
create policy "Users can view their own syllogism sessions"
  on public.syllogism_sessions for select
  using (auth.uid() = user_id);

comment on table public.syllogism_sessions is
  'User syllogism drill sessions (Decision Making) with aggregate accuracy per logic group.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) BUG REPORTS (feedback: bugs + suggestions)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type text not null default 'bug',
  description text not null,
  page_url text,
  created_at timestamptz not null default now()
);

-- Ensure columns
alter table public.bug_reports add column if not exists type text not null default 'bug';

-- Constraints
alter table public.bug_reports drop constraint if exists bug_reports_type_check;
alter table public.bug_reports add constraint bug_reports_type_check
  check (type in ('bug', 'suggestion'));

alter table public.bug_reports drop constraint if exists bug_reports_description_length_check;
alter table public.bug_reports add constraint bug_reports_description_length_check
  check (length(description) <= 4000);

alter table public.bug_reports drop constraint if exists bug_reports_page_url_length_check;
alter table public.bug_reports add constraint bug_reports_page_url_length_check
  check (page_url is null or length(page_url) <= 255);

-- Index
create index if not exists bug_reports_created_at
  on public.bug_reports (created_at desc);

-- RLS
alter table public.bug_reports enable row level security;

drop policy if exists "Users can insert bug reports" on public.bug_reports;
create policy "Users can insert bug reports"
  on public.bug_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can insert anonymous feedback" on public.bug_reports;
create policy "Anyone can insert anonymous feedback"
  on public.bug_reports for insert to anon
  with check (user_id is null);

drop policy if exists "Admins can view bug reports" on public.bug_reports;
create policy "Admins can view bug reports"
  on public.bug_reports for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

comment on table public.bug_reports is
  'User-submitted feedback (bugs and suggestions); admin-only read.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) ANALYTICS EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_name text not null,
  event_properties jsonb default '{}',
  pathname text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_created on public.analytics_events(user_id, created_at) where user_id is not null;
create index if not exists analytics_events_name_created on public.analytics_events(event_name, created_at);
create index if not exists analytics_events_session on public.analytics_events(session_id, created_at);

-- Length and size limits to prevent abuse
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

alter table public.analytics_events enable row level security;

drop policy if exists "Anyone can insert analytics events" on public.analytics_events;
create policy "Anyone can insert analytics events"
  on public.analytics_events for insert
  with check (
    (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()))
    or (auth.role() = 'anon' and user_id is null)
  );

drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events"
  on public.analytics_events for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

comment on table public.analytics_events is
  'Product analytics events: page views, trainer usage, auth, feature usage.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) ADMIN STATS AND ANALYTICS (date-range aware)
-- ─────────────────────────────────────────────────────────────────────────────
-- get_admin_stats(since_ts, until_ts): null = all time
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

comment on function public.get_admin_stats(timestamptz, timestamptz) is
  'Returns aggregate stats for admin dashboard, optionally filtered by date range. Admin only.';

-- get_analytics_summary(since_ts, until_ts): event counts, by day, trainer by type, funnel, unique sessions/users
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 7) VERIFICATION QUERY (run after the above to confirm everything is set up)
-- ─────────────────────────────────────────────────────────────────────────────
-- This select will show you the tables and their columns so you can confirm:
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'sessions', 'bug_reports', 'syllogism_questions', 'syllogism_sessions', 'analytics_events')
order by table_name, ordinal_position;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8) OPTIONAL: Make yourself admin
-- Replace the UUID below with your auth user id from Authentication → Users
-- ─────────────────────────────────────────────────────────────────────────────
-- update public.profiles set role = 'admin' where id = 'your-auth-user-uuid-here';
