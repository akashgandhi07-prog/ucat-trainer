-- Admin: import AI-generated questions as drafts (upsert by legacy_id).

create unique index if not exists idx_tq_legacy_id_unique
  on public.trainer_questions (legacy_id)
  where legacy_id is not null;

create or replace function public.admin_import_trainer_question_drafts(
  p_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin   boolean;
  item       jsonb;
  items      jsonb;
  legacy     text;
  existing   public.trainer_questions%rowtype;
  created_n  integer := 0;
  updated_n  integer := 0;
  skipped    jsonb := '[]'::jsonb;
  errors     jsonb := '[]'::jsonb;
  i          integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_questions is null then
    raise exception 'p_questions is required';
  end if;

  if jsonb_typeof(p_questions) = 'array' then
    items := p_questions;
  elsif jsonb_typeof(p_questions) = 'object' and (p_questions ? 'questions') then
    items := p_questions->'questions';
  else
    raise exception 'Expected a JSON array or { "questions": [...] }';
  end if;

  if jsonb_typeof(items) <> 'array' then
    raise exception 'questions must be a JSON array';
  end if;

  for i in 0 .. jsonb_array_length(items) - 1 loop
    item := items->i;
    legacy := nullif(trim(both from coalesce(item->>'legacy_id', item->>'id', '')), '');

    if legacy is null then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i,
        'legacy_id', null,
        'message', 'Missing legacy_id or id'
      ));
      continue;
    end if;

    if coalesce(item->>'trainer_type', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing trainer_type'
      ));
      continue;
    end if;

    if coalesce(item->>'section', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing section'
      ));
      continue;
    end if;

    if coalesce(item->>'question_kind', '') = '' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing question_kind'
      ));
      continue;
    end if;

    if item->'content' is null or jsonb_typeof(item->'content') <> 'object' then
      errors := errors || jsonb_build_array(jsonb_build_object(
        'index', i, 'legacy_id', legacy, 'message', 'Missing or invalid content object'
      ));
      continue;
    end if;

    select * into existing
    from public.trainer_questions
    where legacy_id = legacy;

    if found then
      if existing.status = 'active' then
        skipped := skipped || jsonb_build_array(jsonb_build_object(
          'legacy_id', legacy,
          'reason', 'Already active. Duplicate as draft in Question Lab to replace.'
        ));
        continue;
      end if;

      update public.trainer_questions
      set
        section        = item->>'section',
        trainer_type   = item->>'trainer_type',
        question_kind  = item->>'question_kind',
        difficulty     = coalesce(nullif(item->>'difficulty', ''), 'medium'),
        skill_tag      = coalesce(item->>'skill_tag', ''),
        stem           = coalesce(item->>'stem', ''),
        explanation    = coalesce(item->>'explanation', ''),
        content        = item->'content',
        media          = coalesce(item->'media', '[]'::jsonb),
        quality_status = coalesce(nullif(item->>'quality_status', ''), 'unchecked'),
        quality_notes  = item->>'quality_notes',
        status         = 'draft',
        updated_by     = auth.uid()
      where legacy_id = legacy;

      updated_n := updated_n + 1;
    else
      insert into public.trainer_questions (
        legacy_id,
        section,
        trainer_type,
        question_kind,
        status,
        difficulty,
        skill_tag,
        stem,
        explanation,
        content,
        media,
        quality_status,
        quality_notes,
        created_by,
        updated_by
      ) values (
        legacy,
        item->>'section',
        item->>'trainer_type',
        item->>'question_kind',
        'draft',
        coalesce(nullif(item->>'difficulty', ''), 'medium'),
        coalesce(item->>'skill_tag', ''),
        coalesce(item->>'stem', ''),
        coalesce(item->>'explanation', ''),
        item->'content',
        coalesce(item->'media', '[]'::jsonb),
        coalesce(nullif(item->>'quality_status', ''), 'unchecked'),
        item->>'quality_notes',
        auth.uid(),
        auth.uid()
      );

      created_n := created_n + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created', created_n,
    'updated', updated_n,
    'skipped', skipped,
    'errors', errors
  );
end;
$$;

comment on function public.admin_import_trainer_question_drafts is
  'Import AI-generated questions as drafts. Upserts by legacy_id. Skips active rows. Admin only.';

grant execute on function public.admin_import_trainer_question_drafts(jsonb)
  to authenticated;
