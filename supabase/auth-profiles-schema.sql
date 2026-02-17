-- =============================================================================
-- UCAT Trainer - Auth & Profiles schema (Supabase)
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor when you need to fix or sync
-- login/registration (profiles table and removal of the old signup trigger).
-- For a full schema (sessions, bug_reports, admin), run full-schema-setup.sql instead.
-- Safe to run multiple times; does not drop existing data.
--
-- After running: in Supabase Dashboard → Authentication → URL Configuration,
-- add your app URL (and http://localhost:5173 for dev) to Redirect URLs so
-- magic links work.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PROFILES TABLE
-- -----------------------------------------------------------------------------
-- Profiles are created by the app on first sign-in (useAuth + upsertProfile),
-- not by a database trigger. This avoids "Database error saving new user".
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  stream text,
  first_name text,
  last_name text,
  entry_year text,
  email_marketing_opt_in boolean not null default false,
  email_marketing_opt_in_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Ensure columns and constraints (idempotent)
alter table public.profiles add column if not exists stream text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists entry_year text;
alter table public.profiles add column if not exists email_marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists email_marketing_opt_in_at timestamptz;
alter table public.profiles drop constraint if exists profiles_stream_check;
alter table public.profiles add constraint profiles_stream_check
  check (
    stream is null
    or stream in (
      'Medicine',
      'Dentistry',
      'Veterinary Medicine',
      'Other',
      'Undecided'
    )
  );

-- Role: default 'user'; admins set via separate update
alter table public.profiles add column if not exists role text not null default 'user';
update public.profiles set role = 'user' where role is null;

alter table public.profiles enable row level security;

-- RLS policies: user can only read/insert/update their own row (auth.uid() = id)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2) REMOVE AUTH TRIGGER (required for magic link to work)
-- -----------------------------------------------------------------------------
-- The old trigger tried to insert into profiles on auth signup; RLS blocks that
-- because there is no session yet. Dropping it fixes "Database error saving new user".
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

comment on table public.profiles is 'User profile. Created/updated on first sign-in from the app.';
