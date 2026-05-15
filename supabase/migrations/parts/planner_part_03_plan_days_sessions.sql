create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_week_id uuid references public.plan_weeks(id) on delete set null,
  day_date date not null,
  availability text not null default 'available' check (
    availability in ('available','reduced','unavailable')),
  custom_hours numeric(4,2),
  is_rest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, day_date));

create table if not exists public.plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_day_id uuid references public.plan_days(id) on delete cascade,
  day_date date not null,
  session_type text not null check (session_type in (
    'vr_practice','dm_practice','qr_practice','sjt_practice',
    'mini_mock','full_mock','reflection','rest')),
  duration_minutes integer not null default 60,
  position integer not null default 0,
  is_timed boolean not null default false,
  notes text,
  planner_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());

create table if not exists public.session_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.plan_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  minutes_completed integer not null default 0 check (minutes_completed >= 0),
  perceived_effort smallint check (
    perceived_effort is null or perceived_effort between 1 and 5),
  completed_at timestamptz not null default now(),
  unique (session_id, student_id));
