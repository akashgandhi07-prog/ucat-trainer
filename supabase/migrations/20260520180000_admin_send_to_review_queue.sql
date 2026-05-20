-- Return an active question to the review queue (draft + needs_review).

create or replace function public.admin_send_question_to_review_queue(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  src public.trainer_questions;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select * into src
  from public.trainer_questions
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  if src.status <> 'active' then
    raise exception 'Only active questions can be sent to the review queue (current status: %)', src.status;
  end if;

  update public.trainer_questions
  set
    status         = 'draft',
    quality_status = 'needs_review',
    quality_notes  = trim(both from coalesce(quality_notes, '') || E'\nReturned to review queue.'),
    updated_by     = auth.uid()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'status', 'draft',
    'quality_status', 'needs_review'
  );
end;
$$;

comment on function public.admin_send_question_to_review_queue(uuid) is
  'Unpublish an active question: status draft, quality needs_review. Students no longer see it until re-activated.';

grant execute on function public.admin_send_question_to_review_queue(uuid)
  to authenticated;
