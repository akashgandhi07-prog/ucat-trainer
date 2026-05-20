-- Return full DM teaching fields from trainer_questions.content (not only local TS enrichment).

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
        'options',     case
          when jsonb_typeof(q.content->'optionsList') = 'array' then q.content->'optionsList'
          else jsonb_build_array(
            jsonb_build_object('id', 'A', 'text', q.content->'options'->>'A'),
            jsonb_build_object('id', 'B', 'text', q.content->'options'->>'B'),
            jsonb_build_object('id', 'C', 'text', q.content->'options'->>'C'),
            jsonb_build_object('id', 'D', 'text', q.content->'options'->>'D')
          )
        end,
        'correctAnswer',        q.content->>'correctAnswer',
        'explanation',          q.explanation,
        'skillTag',             q.skill_tag,
        'commonTrap',           coalesce(q.content->>'commonTrap', ''),
        'optionalWorkingSteps', q.content->'workingSteps',
        'generalRule',          q.content->>'generalRule',
        'wrongOptionReasons',   q.content->'wrongOptionReasons',
        'keyInsight',           q.content->>'keyInsight',
        'review',               case
          when q.content ? 'review' and jsonb_typeof(q.content->'review') = 'object'
            then q.content->'review'
          else jsonb_build_object(
            'ambiguityRisk', 'low',
            'whySafeToInclude', 'Active question from trainer_questions'
          )
        end
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
  'Returns active DM questions with full content fields (generalRule, wrongOptionReasons, keyInsight, review, option labels).';

grant execute on function public.get_dm_trainer_drill(text) to anon, authenticated;

-- QR conversions: serve active questions from trainer_questions when present.

create or replace function public.get_qr_conversion_drill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          q.legacy_id,
        'category',    coalesce(q.content->>'category', q.skill_tag),
        'prompt',      coalesce(q.content->>'question', q.stem),
        'answer',      (q.content->>'correctAnswer')::numeric,
        'answerLabel', coalesce(q.content->>'units', ''),
        'explanation', coalesce(
          q.content->'explanation',
          jsonb_build_object(
            'method', jsonb_build_object(
              'target', '',
              'convert', '',
              'calculate', coalesce(q.content->>'workedSolution', q.explanation, '')
            ),
            'examShortcut', coalesce(q.content->>'workedSolution', q.explanation, ''),
            'senseCheck', '',
            'commonTrap', coalesce(q.content->>'commonTrap', '')
          )
        )
      )
      order by q.legacy_id
    ),
    '[]'::jsonb
  )
  into result
  from public.trainer_questions q
  where q.trainer_type = 'qr-conversions'
    and q.status = 'active';

  return result;
end;
$$;

comment on function public.get_qr_conversion_drill() is
  'Returns active QR conversion questions from trainer_questions.';

grant execute on function public.get_qr_conversion_drill() to anon, authenticated;
