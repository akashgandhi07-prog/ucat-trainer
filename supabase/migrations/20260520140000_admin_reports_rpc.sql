-- Admin RPCs for question reports management.
--
-- admin_get_question_reports  - paginated list of student reports with question info
-- admin_update_report_status  - change report status (reviewed/dismissed/fixed)

-- ─── admin_get_question_reports ──────────────────────────────────────────────

create or replace function public.admin_get_question_reports(
  p_status  text    default null,   -- 'open' | 'reviewed' | 'dismissed' | 'fixed'
  p_limit   integer default 100,
  p_offset  integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin    boolean;
  result      jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  select count(*)::integer
  into total_count
  from public.question_reports r
  where (p_status is null or r.status = p_status);

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id',          r.id,
          'reason',      r.reason,
          'notes',       r.notes,
          'status',      r.status,
          'created_at',  r.created_at,
          'reviewed_at', r.reviewed_at,
          'question_id',       q.id,
          'question_legacy_id', q.legacy_id,
          'question_trainer_type', q.trainer_type,
          'question_status',   q.status,
          'question_stem',     q.stem,
          'question_flag_count', q.flag_count
        )
        order by r.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.question_reports r
  left join public.trainer_questions q on q.id = r.trainer_question_id
  where (p_status is null or r.status = p_status)
  limit  p_limit
  offset p_offset;

  return result;
end;
$$;

comment on function public.admin_get_question_reports is
  'Paginated list of question_reports with joined question info. Admin only.';

grant execute on function public.admin_get_question_reports(text, integer, integer)
  to authenticated;

-- ─── admin_update_report_status ──────────────────────────────────────────────

create or replace function public.admin_update_report_status(
  p_id     uuid,
  p_status text   -- 'reviewed' | 'dismissed' | 'fixed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then raise exception 'Forbidden: admin only'; end if;

  if p_status not in ('reviewed', 'dismissed', 'fixed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.question_reports
  set status      = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_id;

  if not found then
    raise exception 'Report not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

comment on function public.admin_update_report_status is
  'Update question report status (reviewed/dismissed/fixed). Admin only.';

grant execute on function public.admin_update_report_status(uuid, text)
  to authenticated;
