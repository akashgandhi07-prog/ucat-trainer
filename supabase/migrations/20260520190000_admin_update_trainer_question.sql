-- Allow admin copy edits: full fields on drafts, explanation-only on active.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.content       is distinct from old.content       or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit content fields on an active question (id: %). '
        'Duplicate as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks structural edits on active questions. Explanation text may still be patched via admin_update_trainer_question.';

create or replace function public.admin_update_trainer_question(
  p_id uuid,
  p_stem text default null,
  p_explanation text default null,
  p_question text default null,
  p_options jsonb default null
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
  opt_key text;
  opt_text text;
  opt_list jsonb := '[]'::jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into row
  from public.trainer_questions
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if row.status = 'archived' then
    raise exception 'Cannot edit archived questions. Re-activate or duplicate as draft first.';
  end if;

  if row.status = 'active' then
    if p_stem is not null or p_question is not null or p_options is not null then
      raise exception 'Active questions: only explanation can be edited. Use Duplicate as Draft for other changes.';
    end if;
    if p_explanation is null then
      raise exception 'Nothing to save';
    end if;

    update public.trainer_questions
    set
      explanation = p_explanation,
      updated_by  = auth.uid()
    where id = p_id;

    return jsonb_build_object('ok', true, 'id', p_id, 'scope', 'explanation_only');
  end if;

  -- draft (and any non-active non-archived): merge content fields
  merged := row.content;

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

comment on function public.admin_update_trainer_question(uuid, text, text, text, jsonb) is
  'Admin copy edit. Drafts: stem, explanation, question, options. Active: explanation only.';

grant execute on function public.admin_update_trainer_question(uuid, text, text, text, jsonb)
  to authenticated;
