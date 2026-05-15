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
