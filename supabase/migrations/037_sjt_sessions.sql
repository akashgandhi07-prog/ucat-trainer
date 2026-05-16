-- SJT skills trainer session history (per scenario, completed or partial).

create table if not exists public.sjt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  question_type text not null check (question_type in ('appropriateness', 'importance', 'ranking')),
  domain text not null,
  score numeric not null check (score >= 0),
  max_score numeric not null check (max_score > 0),
  items_attempted integer not null check (items_attempted >= 0),
  items_total integer not null check (items_total > 0),
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.sjt_sessions is 'User SJT drill attempts: one row per scenario completion or partial abandon.';

create index if not exists sjt_sessions_user_id_created_at_idx
  on public.sjt_sessions (user_id, created_at desc);

alter table public.sjt_sessions enable row level security;

create policy "Users can insert their own sjt sessions"
  on public.sjt_sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own sjt sessions"
  on public.sjt_sessions for select
  using ((select auth.uid()) = user_id);
