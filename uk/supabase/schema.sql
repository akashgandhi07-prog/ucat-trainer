-- UCAT Revision Timetable App - Supabase Schema
--
-- WARNING: This is the legacy standalone planner shape (public.users + public.sessions).
-- Do not run it against the unified Skills production database.
--
-- The Next.js app in this repo expects the shared Skills schema instead:
--   public.profiles.planner_role, public.plan_sessions, plans FK to profiles, etc.
-- Apply repo-root migrations such as:
--   supabase/migrations/024_planner_unified_plan_sessions.sql
--
-- Keep this file only for disposable local databases or historical reference.

-- Run this in your Supabase SQL editor to set up all tables and RLS policies

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS (extends auth.users)
-- ─────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('student', 'tutor')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- PLANS
-- ─────────────────────────────────────────────
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  student_id uuid not null references public.users(id) on delete cascade,
  tutor_id uuid references public.users(id) on delete set null,
  exam_date date not null,
  exam_time time,                          -- time of exam e.g. '09:00'
  school_day_hours numeric(4,2) not null default 2.0,
  weekend_hours numeric(4,2) not null default 4.0,
  holiday_periods jsonb not null default '[]',
  has_prior_experience boolean not null default false,
  -- Confidence scores 1-5 per section
  confidence_vr smallint not null default 3 check (confidence_vr between 1 and 5),
  confidence_dm smallint not null default 3 check (confidence_dm between 1 and 5),
  confidence_qr smallint not null default 3 check (confidence_qr between 1 and 5),
  confidence_sjt smallint not null default 3 check (confidence_sjt between 1 and 5),
  -- Rest days: array of day-of-week (0=Sun, 1=Mon … 6=Sat)
  rest_days integer[] not null default '{}',
  ucat_sen boolean not null default false,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  mock_target_total smallint check (mock_target_total is null or mock_target_total between 900 and 2700),
  mock_target_sjt_band smallint check (mock_target_sjt_band is null or mock_target_sjt_band between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- PLAN WEEKS: per-week metadata + adjustments
-- ─────────────────────────────────────────────
create table public.plan_weeks (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_number integer not null,        -- 1-indexed from plan start
  week_start date not null,
  week_type text not null default 'school' check (week_type in ('school', 'holiday')),
  default_hours numeric(4,2) not null default 2.0,
  -- Dynamic adjustment fields
  difficulty_rating smallint check (difficulty_rating between 1 and 3),
  is_locked boolean not null default false,  -- past weeks get locked
  tutor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

-- ─────────────────────────────────────────────
-- STUDENT INVITE LINKS (tutor-shareable onboarding URLs)
-- ─────────────────────────────────────────────

create table if not exists public.student_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  tutor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_student_id uuid references public.users(id) on delete set null
);

create index if not exists student_invite_links_tutor_idx on public.student_invite_links (tutor_id);
create index if not exists student_invite_links_pending_idx on public.student_invite_links (token)
  where redeemed_at is null;

-- ─────────────────────────────────────────────
-- PLAN DAYS: individual day overrides
-- ─────────────────────────────────────────────
create table public.plan_days (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_week_id uuid references public.plan_weeks(id) on delete set null,
  day_date date not null,
  availability text not null default 'available' check (availability in ('available', 'reduced', 'unavailable')),
  custom_hours numeric(4,2),            -- null = use week default
  is_rest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, day_date)
);

-- ─────────────────────────────────────────────
-- SESSIONS: individual study sessions
-- ─────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_day_id uuid references public.plan_days(id) on delete cascade,
  day_date date not null,
  session_type text not null check (session_type in (
    'vr_practice', 'dm_practice', 'qr_practice', 'sjt_practice',
    'mini_mock', 'full_mock', 'reflection', 'rest'
  )),
  duration_minutes integer not null default 60,
  position integer not null default 0,   -- order within the day
  is_timed boolean not null default false,
  notes text,
  planner_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SESSION COMPLETIONS
-- ─────────────────────────────────────────────
create table public.session_completions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  minutes_completed integer not null default 0 check (minutes_completed >= 0),
  perceived_effort smallint check (perceived_effort is null or perceived_effort between 1 and 5),
  completed_at timestamptz not null default now(),
  unique (session_id, student_id)
);

-- ─────────────────────────────────────────────
-- EXTRA STUDY LOGS: extra work beyond plan
-- ─────────────────────────────────────────────
create table public.extra_study_logs (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  day_date date not null,
  section text not null check (section in ('vr', 'dm', 'qr', 'sjt')),
  minutes integer not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, student_id, day_date, section)
);

-- ─────────────────────────────────────────────
-- MOCK SCORES
-- ─────────────────────────────────────────────
create table public.mock_scores (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  logged_date date not null default current_date,
  week_number integer,
  score_vr smallint check (score_vr between 300 and 900),
  score_dm smallint check (score_dm between 300 and 900),
  score_qr smallint check (score_qr between 300 and 900),
  score_sjt smallint check (score_sjt between 1 and 4),
  mock_type text not null default 'full' check (mock_type in ('full', 'mini')),
  mock_source text check (mock_source in ('medify', 'medentry', 'passmedicine', 'book', 'official')),
  weakness_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- WEEKLY REFLECTIONS
-- ─────────────────────────────────────────────
create table public.weekly_reflections (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  week_number integer not null,
  reflection_text text not null,
  difficulty_rating smallint not null check (difficulty_rating between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

-- ─────────────────────────────────────────────
-- PLAN MEMBERS (tutor ↔ student join)
-- ─────────────────────────────────────────────
create table public.plan_members (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('student', 'tutor')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (plan_id, user_id)
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index on public.sessions (plan_id, day_date);
create index on public.plan_days (plan_id, day_date);
create index on public.extra_study_logs (plan_id, day_date);
create index on public.mock_scores (plan_id, logged_date);
create index on public.weekly_reflections (plan_id, week_number);
create index on public.plan_members (user_id);

-- ─────────────────────────────────────────────
-- UPDATED_AT triggers
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plan_weeks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plan_days
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.extra_study_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.weekly_reflections
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_days enable row level security;
alter table public.sessions enable row level security;
alter table public.session_completions enable row level security;
alter table public.extra_study_logs enable row level security;
alter table public.mock_scores enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.plan_members enable row level security;
alter table public.student_invite_links enable row level security;

-- Helper: is the current user a tutor linked to a given plan?
create or replace function public.is_plan_tutor(p_plan_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.plan_members
    where plan_id = p_plan_id
      and user_id = auth.uid()
      and role = 'tutor'
  );
$$;

-- Helper: is the current user the student on a given plan?
create or replace function public.is_plan_student(p_plan_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.plans
    where id = p_plan_id
      and student_id = auth.uid()
  );
$$;

-- Tutor onboarding invite links: token validation / redemption (consume called from authenticated API)

create or replace function public.student_invite_token_valid(p_token text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.student_invite_links
    where token = p_token and redeemed_at is null
  );
$$;

grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

create or replace function public.consume_student_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
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
  where token = p_token
    and redeemed_at is null
  returning tutor_id into v_tutor;

  return v_tutor;
end;
$$;

grant execute on function public.consume_student_invite(text) to authenticated;

-- users: read own row, tutors can read linked students
create policy "users: read own" on public.users for select using (id = auth.uid());
create policy "users: insert own" on public.users for insert with check (id = auth.uid());
create policy "users: update own" on public.users for update using (id = auth.uid());

-- plans: public select by slug (no login), full access for student+tutor
create policy "plans: public read by slug" on public.plans for select using (true);
create policy "plans: student insert" on public.plans for insert with check (student_id = auth.uid());
create policy "plans: student update" on public.plans for update using (student_id = auth.uid() or is_plan_tutor(id));
create policy "plans: tutor update" on public.plans for update using (is_plan_tutor(id));

-- plan_weeks
create policy "plan_weeks: read" on public.plan_weeks for select using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);
create policy "plan_weeks: write" on public.plan_weeks for all using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);

-- plan_days
create policy "plan_days: read" on public.plan_days for select using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);
create policy "plan_days: write" on public.plan_days for all using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);

-- sessions
create policy "sessions: read" on public.sessions for select using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);
create policy "sessions: write" on public.sessions for all using (
  is_plan_student(plan_id) or is_plan_tutor(plan_id)
);

-- session_completions: student only
create policy "completions: student read" on public.session_completions for select using (student_id = auth.uid());
create policy "completions: student write" on public.session_completions for all using (student_id = auth.uid());

-- extra_study_logs: student only
create policy "extra_study: student read" on public.extra_study_logs for select using (student_id = auth.uid());
create policy "extra_study: student write" on public.extra_study_logs for all using (student_id = auth.uid());

-- mock_scores: student writes, tutor reads
create policy "mock_scores: student write" on public.mock_scores for all using (student_id = auth.uid());
create policy "mock_scores: tutor read" on public.mock_scores for select using (is_plan_tutor(plan_id));

-- weekly_reflections: same as mock_scores
create policy "reflections: student write" on public.weekly_reflections for all using (student_id = auth.uid());
create policy "reflections: tutor read" on public.weekly_reflections for select using (is_plan_tutor(plan_id));

-- plan_members
create policy "plan_members: read" on public.plan_members for select using (user_id = auth.uid() or is_plan_tutor(plan_id));
create policy "plan_members: write" on public.plan_members for all using (user_id = auth.uid() or is_plan_tutor(plan_id));

-- student_invite_links
create policy "student_invite_links: tutor read own"
  on public.student_invite_links for select using (tutor_id = auth.uid());

create policy "student_invite_links: tutor insert own"
  on public.student_invite_links for insert with check (tutor_id = auth.uid());

-- ─────────────────────────────────────────────
-- AUTO-CREATE user profile on signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- MIGRATIONS (run these if upgrading an existing DB)
-- ─────────────────────────────────────────────
-- alter table public.plans add column if not exists exam_time time;
-- alter table public.plans add column if not exists school_day_hours numeric(4,2) not null default 2.0;
-- alter table public.plans add column if not exists weekend_hours numeric(4,2) not null default 4.0;
-- alter table public.plans add column if not exists holiday_periods jsonb not null default '[]';
-- alter table public.mock_scores add column if not exists mock_source text check (mock_source in ('medify', 'medentry', 'passmedicine', 'book', 'official'));
