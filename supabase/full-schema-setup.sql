-- =============================================================================
-- UCAT Trainer – Full Supabase Schema Setup
-- =============================================================================
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query, then Run.
-- Safe to run multiple times: creates missing objects, adds missing columns,
-- and recreates policies/functions. Does not drop existing data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PROFILES
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  stream text check (stream is null or stream in ('Medicine', 'Dentistry', 'Undecided')),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists stream text;
alter table public.profiles drop constraint if exists profiles_stream_check;
alter table public.profiles add constraint profiles_stream_check check (stream is null or stream in ('Medicine', 'Dentistry', 'Undecided'));

alter table public.profiles add column if not exists role text not null default 'user';
update public.profiles set role = 'user' where role is null;

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

-- Trigger: create/update profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_stream text;
begin
  meta_stream := new.raw_user_meta_data->>'stream';
  if meta_stream is null or meta_stream not in ('Medicine', 'Dentistry', 'Undecided') then
    meta_stream := 'Undecided';
  end if;

  insert into public.profiles (id, full_name, stream, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    meta_stream,
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    stream = coalesce(excluded.stream, profiles.stream),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row
  execute function public.handle_new_user();

comment on table public.profiles is 'User profile (display name, role). Synced from auth.users on sign-in.';

-- -----------------------------------------------------------------------------
-- 2) SESSIONS
-- -----------------------------------------------------------------------------
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

alter table public.sessions add column if not exists time_seconds integer;

create index if not exists sessions_user_id_created_at on public.sessions (user_id, created_at);

alter table public.sessions enable row level security;

drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

comment on table public.sessions is 'Training sessions (speed reading, rapid recall, keyword scanning).';
comment on column public.sessions.time_seconds is 'Duration in seconds (e.g. scan time for keyword_scanning, reading window for rapid_recall).';

-- -----------------------------------------------------------------------------
-- 3) BUG_REPORTS (feedback: bugs + suggestions)
-- -----------------------------------------------------------------------------
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type text not null default 'bug' check (type in ('bug', 'suggestion')),
  description text not null,
  page_url text,
  created_at timestamptz not null default now()
);

-- Ensure type column exists (for tables created before type was added)
alter table public.bug_reports add column if not exists type text not null default 'bug';

-- Ensure type check constraint (drop if exists to avoid duplicate constraint errors)
alter table public.bug_reports drop constraint if exists bug_reports_type_check;
alter table public.bug_reports add constraint bug_reports_type_check check (type in ('bug', 'suggestion'));

create index if not exists bug_reports_created_at on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

drop policy if exists "Users can insert bug reports" on public.bug_reports;
create policy "Users can insert bug reports"
  on public.bug_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view bug reports" on public.bug_reports;
create policy "Admins can view bug reports"
  on public.bug_reports for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

comment on table public.bug_reports is 'User-submitted feedback (bugs and suggestions); admin-only read.';

-- -----------------------------------------------------------------------------
-- 4) ADMIN STATS FUNCTION
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5) OPTIONAL: Make yourself admin (run in a separate query after this script)
-- Replace the UUID with your auth user id from Authentication → Users
-- -----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where id = 'your-auth-user-uuid-here';
