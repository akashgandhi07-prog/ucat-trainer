-- Fix legacy_id on activate replacement; expand admin edit for all trainers + teaching fields.

drop function if exists public.admin_update_trainer_question(uuid, text, text, text, jsonb);

create or replace function public.admin_update_question_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  v_replaces uuid;
  v_legacy text;
  v_row_legacy text;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_status = 'active' then
    select replaces_question_id, legacy_id
    into v_replaces, v_row_legacy
    from public.trainer_questions
    where id = p_id;

    if not found then
      raise exception 'Question not found: %', p_id;
    end if;

    v_legacy := v_row_legacy;
    if v_legacy is null and v_replaces is not null then
      select legacy_id into v_legacy
      from public.trainer_questions
      where id = v_replaces;
    end if;

    if v_replaces is not null then
      update public.trainer_questions
      set status = 'archived', legacy_id = null
      where id = v_replaces and status = 'active';
    end if;

    update public.trainer_questions
    set
      status     = 'active',
      legacy_id  = v_legacy,
      updated_by = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'status', 'active', 'legacy_id', v_legacy);
  end if;

  update public.trainer_questions
  set status = p_status, updated_by = auth.uid()
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

create or replace function public.admin_update_trainer_question(
  p_id uuid,
  p_stem text default null,
  p_explanation text default null,
  p_question text default null,
  p_options jsonb default null,
  p_content_patch jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  row public.trainer_questions;
  merged jsonb;
  patch_key text;
  allowed_active text[] := array[
    'generalRule', 'keyInsight', 'wrongOptionReasons', 'review',
    'pivotInsight', 'explanation', 'workedSolution', 'commonTrap', 'workingSteps'
  ];
  opt_key text;
  opt_text text;
  opt_list jsonb := '[]'::jsonb;
  is_allowed boolean;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into row from public.trainer_questions where id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if row.status = 'archived' then
    raise exception 'Cannot edit archived questions. Re-activate or duplicate as draft first.';
  end if;

  merged := row.content;

  if row.status = 'active' then
    if p_stem is not null or p_question is not null or p_options is not null then
      raise exception 'Active questions: edit explanation and teaching fields only. Use Send to review queue for full edits.';
    end if;

    if p_content_patch is not null and jsonb_typeof(p_content_patch) = 'object' then
      for patch_key in select jsonb_object_keys(p_content_patch) loop
        select patch_key = any(allowed_active) into is_allowed;
        if not is_allowed then
          raise exception 'Cannot patch "%" on an active question', patch_key;
        end if;
        merged := jsonb_set(merged, array[patch_key], p_content_patch->patch_key, true);
      end loop;
    end if;

    update public.trainer_questions
    set
      explanation  = coalesce(p_explanation, explanation),
      content      = merged,
      updated_by   = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'active_teaching');
  end if;

  -- draft: full merge
  if p_question is not null then
    merged := jsonb_set(merged, '{question}', to_jsonb(p_question), true);
  end if;

  if p_options is not null and jsonb_typeof(p_options) = 'object' then
    merged := jsonb_set(merged, '{options}', p_options, true);
    for opt_key in select unnest(array['A', 'B', 'C', 'D']) loop
      opt_text := p_options ->> opt_key;
      if opt_text is not null then
        opt_list := opt_list || jsonb_build_array(
          jsonb_build_object('id', opt_key, 'text', opt_text)
        );
      end if;
    end loop;
    if jsonb_array_length(opt_list) = 4 then
      merged := jsonb_set(merged, '{optionsList}', opt_list, true);
    end if;
  end if;

  if p_content_patch is not null and jsonb_typeof(p_content_patch) = 'object' then
    for patch_key in select jsonb_object_keys(p_content_patch) loop
      merged := jsonb_set(merged, array[patch_key], p_content_patch->patch_key, true);
    end loop;
  end if;

  update public.trainer_questions
  set
    stem          = coalesce(p_stem, stem),
    explanation   = coalesce(p_explanation, explanation),
    content       = merged,
    updated_by    = auth.uid()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'draft');
end;
$$;

comment on function public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb) is
  'Admin copy edit. Draft: full fields + content patch. Active: explanation + teaching content patch only.';

grant execute on function public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb)
  to authenticated;
