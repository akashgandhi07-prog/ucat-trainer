create table if not exists public.skill_trainer_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_attempt_id uuid not null, client_session_id uuid not null,
  trainer_type text not null check (trainer_type in ('qr_setup','qr_extraction','qr_estimation','dm_constraints')),
  question_id text not null, score smallint not null check (score >= 0),
  max_score smallint not null check (max_score > 0 and score <= max_score),
  time_seconds integer not null default 0 check (time_seconds >= 0),
  components jsonb not null default '{}'::jsonb check (jsonb_typeof(components)='object'),
  difficulty text, skill_tags text[] not null default '{}',
  mistake_cause text check (mistake_cause is null or mistake_cause in ('misread','method','calculation','unit','rushed','guessed','changed_answer')),
  created_at timestamptz not null default now(),
  unique(user_id,client_attempt_id)
);
create index if not exists skill_attempts_user_type_created_idx on public.skill_trainer_attempts(user_id,trainer_type,created_at desc);
create index if not exists skill_attempts_user_question_idx on public.skill_trainer_attempts(user_id,trainer_type,question_id);
alter table public.skill_trainer_attempts enable row level security;
drop policy if exists "skill attempts select own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts insert own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts update own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts delete own" on public.skill_trainer_attempts;
create policy "skill attempts select own" on public.skill_trainer_attempts for select using ((select auth.uid())=user_id);
create policy "skill attempts insert own" on public.skill_trainer_attempts for insert with check ((select auth.uid())=user_id);
create policy "skill attempts update own" on public.skill_trainer_attempts for update using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "skill attempts delete own" on public.skill_trainer_attempts for delete using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.skill_trainer_attempts to authenticated;
grant select,insert,update,delete on public.skill_trainer_attempts to service_role;
revoke all on public.skill_trainer_attempts from anon;
