-- VR bank growth support (June 2026)
--
-- 1) get_vr_passage_sets: serve active question-lab VR passage sets (trainer_type
--    'vr-passages') to the trainers. SECURITY DEFINER like get_dm_trainer_drill so
--    guests can read active content without a broad RLS policy on trainer_questions.
-- 2) sessions_training_type_check: allow 'not_except' for the new NOT/EXCEPT drill
--    (constraint must be extended BEFORE the trainer ships or its saves are
--    silently rejected, as happened with unit_conversions).

create or replace function public.get_vr_passage_sets()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'difficulty', q.difficulty,
        'skillTag', q.skill_tag,
        'title', q.content->>'title',
        'category', q.content->>'category',
        'passage', q.content->>'passage',
        'questions', q.content->'questions'
      )
      order by q.created_at
    ),
    '[]'::jsonb
  )
  from trainer_questions q
  where q.trainer_type = 'vr-passages' and q.status = 'active';
$$;

revoke all on function public.get_vr_passage_sets() from public;
grant execute on function public.get_vr_passage_sets() to anon, authenticated, service_role;

alter table public.sessions
  drop constraint sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text,
    'not_except'::text
  ]));
