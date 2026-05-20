-- Allow admin RPC to patch explanation and teaching content on active questions.
-- PostgREST must reload after function signature changes.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit structural fields on an active question (id: %). '
        'Duplicate as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks stem, media, difficulty, skill_tag, trainer_type, question_kind on active rows. '
  'Explanation and content teaching patches go through admin_update_trainer_question.';

notify pgrst, 'reload schema';
