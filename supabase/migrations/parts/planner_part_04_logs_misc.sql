create table if not exists public.extra_study_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  day_date date not null,
  section text not null check (section in ('vr','dm','qr','sjt')),
  minutes integer not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, student_id, day_date, section));

create table if not exists public.mock_scores (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.plan_sessions(id) on delete set null,
  logged_date date not null default current_date,
  week_number integer,
  score_vr smallint check (score_vr between 300 and 900),
  score_dm smallint check (score_dm between 300 and 900),
  score_qr smallint check (score_qr between 300 and 900),
  score_sjt smallint check (score_sjt between 1 and 4),
  mock_type text not null default 'full' check (mock_type in ('full','mini')),
  mock_source text check (
    mock_source in ('medify','medentry','passmedicine','book','official')),
  weakness_tags text[] not null default '{}',
  created_at timestamptz not null default now());

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_number integer not null,
  reflection_text text not null,
  difficulty_rating smallint not null check (difficulty_rating between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number));

create table if not exists public.plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('student','tutor')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (plan_id, user_id));

comment on table public.plan_sessions is
  'Timetable blocks (trainer drill rows live in public.sessions).';
