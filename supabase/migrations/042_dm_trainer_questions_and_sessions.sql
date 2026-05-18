-- DM skills trainers: Venn Logic, Data Logic, Argument Judge
-- Questions are seeded via scripts/seedDmTrainerQuestions.ts (service role).
-- Clients read drills via get_dm_trainer_drill RPC only.

create table if not exists public.dm_trainer_questions (
  id text primary key,
  trainer_type text not null check (trainer_type in ('venn-logic', 'data-logic', 'argument-judge')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  sort_order integer not null check (sort_order >= 0),
  stem text not null,
  question text not null,
  options jsonb not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text not null,
  skill_tag text not null,
  common_trap text not null,
  optional_working_steps jsonb,
  review jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (trainer_type, sort_order)
);

comment on table public.dm_trainer_questions is
  'UCAT Decision Making skills trainer questions (Venn, data, argument). Read via get_dm_trainer_drill.';

create index if not exists dm_trainer_questions_type_active_idx
  on public.dm_trainer_questions (trainer_type, sort_order)
  where is_active = true;

alter table public.dm_trainer_questions enable row level security;

-- No direct SELECT for anon/authenticated (service role seeds only).

create table if not exists public.dm_trainer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trainer_type text not null check (trainer_type in ('venn-logic', 'data-logic', 'argument-judge')),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  retry_mode boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.dm_trainer_sessions is
  'User DM skills trainer drill completions (5-question runs and retries).';

create index if not exists dm_trainer_sessions_user_type_created_idx
  on public.dm_trainer_sessions (user_id, trainer_type, created_at desc);

alter table public.dm_trainer_sessions enable row level security;

create policy "Users can insert their own dm trainer sessions"
  on public.dm_trainer_sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own dm trainer sessions"
  on public.dm_trainer_sessions for select
  using ((select auth.uid()) = user_id);

create or replace function public.get_dm_trainer_drill(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_trainer_type is null or p_trainer_type not in ('venn-logic', 'data-logic', 'argument-judge') then
    raise exception 'Invalid trainer type';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'trainerType', q.trainer_type,
        'difficulty', q.difficulty,
        'stem', q.stem,
        'question', q.question,
        'options', q.options,
        'correctAnswer', q.correct_answer,
        'explanation', q.explanation,
        'skillTag', q.skill_tag,
        'commonTrap', q.common_trap,
        'optionalWorkingSteps', q.optional_working_steps,
        'review', q.review
      )
      order by q.sort_order
    ),
    '[]'::jsonb
  )
  into result
  from public.dm_trainer_questions q
  where q.trainer_type = p_trainer_type
    and q.is_active = true;

  return result;
end;
$$;

comment on function public.get_dm_trainer_drill(text) is
  'Returns ordered DM skills trainer questions as JSON array (camelCase). Callable by anon.';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;
