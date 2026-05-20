-- Bulk delete draft/archived questions (admin only).

create or replace function public.admin_delete_trainer_questions(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  id uuid;
  deleted int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
  one jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'skipped', 0, 'errors', '[]'::jsonb);
  end if;

  foreach id in array p_ids loop
    begin
      one := public.admin_delete_trainer_question(id);
      deleted := deleted + 1;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_array(
        jsonb_build_object('id', id, 'message', SQLERRM)
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
