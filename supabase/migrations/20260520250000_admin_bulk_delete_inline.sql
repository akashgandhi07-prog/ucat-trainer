-- Inline bulk delete logic (no nested RPC calls) and qualify column references.

create or replace function public.admin_delete_trainer_question(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  qrow public.trainer_questions;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into qrow from public.trainer_questions where trainer_questions.id = p_id;
  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if qrow.status = 'active' then
    raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
  end if;

  update public.trainer_questions
  set replaces_question_id = null
  where replaces_question_id = p_id;

  delete from public.trainer_question_attempts where question_id = p_id;
  delete from public.question_reports where trainer_question_id = p_id;
  delete from public.question_reviews where trainer_question_id = p_id;

  delete from public.trainer_questions where trainer_questions.id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'legacy_id', qrow.legacy_id);
end;
$$;

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  question_id uuid;
  qrow public.trainer_questions;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where profiles.id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach question_id in array p_ids loop
    begin
      select * into qrow
      from public.trainer_questions
      where trainer_questions.id = question_id;

      if not found then
        raise exception 'Question not found: %', question_id;
      end if;

      if qrow.status = 'active' then
        raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
      end if;

      update public.trainer_questions
      set replaces_question_id = null
      where replaces_question_id = question_id;

      delete from public.trainer_question_attempts where question_id = question_id;
      delete from public.question_reports where trainer_question_id = question_id;
      delete from public.question_reviews where trainer_question_id = question_id;
      delete from public.trainer_questions where trainer_questions.id = question_id;

      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', question_id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_question(uuid) is
  'Permanently deletes a draft or archived question and related reports, reviews, and attempts.';

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_question(uuid) to authenticated;
grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';
