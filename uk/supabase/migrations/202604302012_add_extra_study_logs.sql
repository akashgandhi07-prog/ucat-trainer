create table if not exists public.extra_study_logs (
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

create index if not exists extra_study_logs_plan_day_idx
  on public.extra_study_logs(plan_id, day_date);

alter table public.extra_study_logs enable row level security;

drop policy if exists "extra_study: student read" on public.extra_study_logs;
drop policy if exists "extra_study: student write" on public.extra_study_logs;
create policy "extra_study: student read" on public.extra_study_logs
  for select using (student_id = auth.uid());
create policy "extra_study: student write" on public.extra_study_logs
  for all using (student_id = auth.uid());

drop trigger if exists set_updated_at on public.extra_study_logs;
create trigger set_updated_at before update on public.extra_study_logs
  for each row execute function public.set_updated_at();
