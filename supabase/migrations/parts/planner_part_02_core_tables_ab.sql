create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid references public.profiles(id) on delete set null,
  exam_date date not null,
  exam_time time,
  current_situation text check (
    current_situation is null or current_situation in (
      'school','gap_year','graduated_free','graduated_working')),
  school_year text check (
    school_year is null or school_year in ('year_12','year_13','other')),
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
    status in ('active','completed','archived')),
  mock_target_total smallint check (
    mock_target_total is null or mock_target_total between 900 and 2700),
  mock_target_sjt_band smallint check (
    mock_target_sjt_band is null or mock_target_sjt_band between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());

create table if not exists public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_number integer not null,
  week_start date not null,
  week_type text not null default 'school' check (week_type in ('school','holiday')),
  default_hours numeric(4,2) not null default 2.0,
  difficulty_rating smallint check (difficulty_rating between 1 and 3),
  is_locked boolean not null default false,
  tutor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, week_number));

create table if not exists public.student_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_student_id uuid references public.profiles(id) on delete set null);

create index if not exists student_invite_links_tutor_idx
  on public.student_invite_links (tutor_id);
create index if not exists student_invite_links_pending_idx
  on public.student_invite_links (token) where redeemed_at is null;
