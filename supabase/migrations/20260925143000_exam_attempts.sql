create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_attempt_id uuid not null,
  bank_title text not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  current_section text,
  current_question integer not null default 0 check (current_question >= 0),
  timed boolean not null default true,
  time_multiplier numeric(4,2) not null default 1 check (time_multiplier > 0),
  started_at timestamptz not null,
  completed_at timestamptz,
  answered_count integer not null default 0 check (answered_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  scorable_count integer not null default 0 check (scorable_count >= 0),
  section_results jsonb not null default '{}'::jsonb check (jsonb_typeof(section_results) = 'object'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_attempt_id)
);

create index if not exists exam_attempts_user_updated_idx
  on public.exam_attempts (user_id, updated_at desc);
create index if not exists exam_attempts_user_status_idx
  on public.exam_attempts (user_id, status, updated_at desc);

alter table public.exam_attempts enable row level security;
drop policy if exists "exam attempts select own" on public.exam_attempts;
drop policy if exists "exam attempts insert own" on public.exam_attempts;
drop policy if exists "exam attempts update own" on public.exam_attempts;
drop policy if exists "exam attempts delete own" on public.exam_attempts;
create policy "exam attempts select own" on public.exam_attempts for select using ((select auth.uid()) = user_id);
create policy "exam attempts insert own" on public.exam_attempts for insert with check ((select auth.uid()) = user_id);
create policy "exam attempts update own" on public.exam_attempts for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "exam attempts delete own" on public.exam_attempts for delete using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.exam_attempts to authenticated;
grant all on public.exam_attempts to service_role;
revoke all on public.exam_attempts from anon;

comment on table public.exam_attempts is 'Resumable full UCAT simulator attempts and per-section progress for signed-in users.';
