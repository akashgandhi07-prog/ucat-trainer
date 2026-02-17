-- Sessions table: training session records per user.
-- RLS restricts so users only see/insert their own rows.

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

create index if not exists sessions_user_id_created_at on public.sessions (user_id, created_at);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

comment on table public.sessions is 'Training sessions (speed reading, rapid recall, keyword scanning).';
