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

-- Stream constraint
alter table public.profiles drop constraint if exists profiles_stream_check;
alter table public.profiles add constraint profiles_stream_check
  check (stream is null or stream in ('Medicine', 'Dentistry', 'Veterinary Medicine', 'Other', 'Undecided'));

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
  check (training_type in ('speed_reading', 'rapid_recall', 'keyword_scanning'));

alter table public.sessions drop constraint if exists sessions_difficulty_check;
alter table public.sessions add constraint sessions_difficulty_check
  check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));

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
  'Training sessions (speed reading, rapid recall, keyword scanning).';
comment on column public.sessions.time_seconds is
  'Duration in seconds (e.g. scan time for keyword_scanning, reading window for rapid_recall).';
comment on column public.sessions.difficulty is
  'Difficulty label chosen for the run (easy, medium, hard).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) BUG REPORTS (feedback: bugs + suggestions)
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
-- 4) ADMIN STATS FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
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
  select (role = 'admin') into is_admin
    from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users',              (select count(*)::int from public.profiles),
    'total_sessions',           (select count(*)::int from public.sessions),
    'sessions_speed_reading',   (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall',    (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning',(select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'bug_reports_count',        (select count(*)::int from public.bug_reports where type = 'bug'),
    'suggestions_count',        (select count(*)::int from public.bug_reports where type = 'suggestion')
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is
  'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) VERIFICATION QUERY (run after the above to confirm everything is set up)
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
  and table_name in ('profiles', 'sessions', 'bug_reports')
order by table_name, ordinal_position;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) OPTIONAL: Make yourself admin
-- Replace the UUID below with your auth user id from Authentication → Users
-- ─────────────────────────────────────────────────────────────────────────────
-- update public.profiles set role = 'admin' where id = 'your-auth-user-uuid-here';
