-- Fix ambiguous question_id: loop variable shadowed trainer_question_attempts.question_id.

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  target_id uuid;
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

  foreach target_id in array p_ids loop
    begin
      select * into qrow
      from public.trainer_questions
      where trainer_questions.id = target_id;

      if not found then
        raise exception 'Question not found: %', target_id;
      end if;

      if qrow.status = 'active' then
        raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
      end if;

      update public.trainer_questions
      set replaces_question_id = null
      where replaces_question_id = target_id;

      delete from public.trainer_question_attempts tqa
      where tqa.question_id = target_id;
      delete from public.question_reports qr
      where qr.trainer_question_id = target_id;
      delete from public.question_reviews qrev
      where qrev.trainer_question_id = target_id;
      delete from public.trainer_questions tq
      where tq.id = target_id;

      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', target_id, 'message', SQLERRM)
      );
    end;
  end loop;

  return jsonb_build_object('deleted', deleted, 'skipped', skipped, 'errors', errors);
end;
$$;

comment on function public.admin_delete_trainer_questions(uuid[]) is
  'Deletes many draft or archived questions. Skips failures and returns per-id errors.';

grant execute on function public.admin_delete_trainer_questions(uuid[]) to authenticated;

notify pgrst, 'reload schema';
