-- Switch get_dm_trainer_drill to read from trainer_questions.
--
-- The old dm_trainer_questions table is NOT dropped — it stays for rollback.
-- To roll back: redeploy the previous version of this function from
-- migration 042_dm_trainer_questions_and_sessions.sql.
--
-- The returned JSON shape is identical to the old RPC so dmTrainerApi.ts
-- needs no changes. Key mapping:
--   legacy_id            → id          (used by frontend for local enrichment lookup)
--   content->question    → question
--   content->options     → options     (object converted back to [{id, text}] array)
--   content->correctAnswer → correctAnswer
--   content->commonTrap  → commonTrap
--   content->workingSteps → optionalWorkingSteps
--   skill_tag            → skillTag
--   trainer_type         → trainerType
--   status = 'active'    replaces is_active = true

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
        'id',          q.legacy_id,
        'dbId',        q.id,
        'trainerType', q.trainer_type,
        'difficulty',  q.difficulty,
        'stem',        q.stem,
        'question',    q.content->>'question',
        'options',     jsonb_build_array(
                         jsonb_build_object('id', 'A', 'text', q.content->'options'->>'A'),
                         jsonb_build_object('id', 'B', 'text', q.content->'options'->>'B'),
                         jsonb_build_object('id', 'C', 'text', q.content->'options'->>'C'),
                         jsonb_build_object('id', 'D', 'text', q.content->'options'->>'D')
                       ),
        'correctAnswer',        q.content->>'correctAnswer',
        'explanation',          q.explanation,
        'skillTag',             q.skill_tag,
        'commonTrap',           q.content->>'commonTrap',
        'optionalWorkingSteps', q.content->'workingSteps',
        'review',               jsonb_build_object(
                                  'ambiguityRisk',   'low',
                                  'whySafeToInclude','Active migrated question'
                                )
      )
      order by q.legacy_id
    ),
    '[]'::jsonb
  )
  into result
  from public.trainer_questions q
  where q.trainer_type = p_trainer_type
    and q.status = 'active';

  return result;
end;
$$;

comment on function public.get_dm_trainer_drill(text) is
  'Returns active DM skills trainer questions from trainer_questions as camelCase JSON array. '
  'Shape is identical to the previous version so no frontend changes are needed. '
  'Old dm_trainer_questions table is kept for rollback. Callable by anon and authenticated.';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;
