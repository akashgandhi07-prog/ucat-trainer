-- Permanently remove draft or archived questions (admin only).

create or replace function public.admin_delete_trainer_question(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  row public.trainer_questions;
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

  if row.status = 'active' then
    raise exception 'Cannot delete an active question. Archive it first, or delete the draft replacement only.';
  end if;

  update public.trainer_questions
  set replaces_question_id = null
  where replaces_question_id = p_id;

  delete from public.trainer_question_attempts where question_id = p_id;
  delete from public.question_reports where trainer_question_id = p_id;
  delete from public.question_reviews where trainer_question_id = p_id;

  delete from public.trainer_questions where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'legacy_id', row.legacy_id);
end;
$$;

comment on function public.admin_delete_trainer_question(uuid) is
  'Permanently deletes a draft or archived question and related reports, reviews, and attempts.';

grant execute on function public.admin_delete_trainer_question(uuid) to authenticated;

notify pgrst, 'reload schema';
