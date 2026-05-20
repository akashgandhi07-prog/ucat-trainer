-- Repair/forward migration for Question Lab admin RPCs.
--
-- The frontend calls these via PostgREST. Some deployed Supabase projects have
-- the trainer question tables and public trainer RPCs but are missing the admin
-- RPC layer in the schema cache, which causes PGRST202 "function not found".

create or replace function public.admin_get_trainer_questions(
  p_section        text    default null,
  p_trainer_type   text    default null,
  p_status         text    default null,
  p_quality_status text    default null,
  p_difficulty     text    default null,
  p_is_flagged     boolean default null,
  p_search         text    default null,
  p_limit          integer default 100,
  p_offset         integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::integer
  into total_count
  from public.trainer_questions q
  where
    (p_section is null or q.section = p_section)
    and (p_trainer_type is null or q.trainer_type = p_trainer_type)
    and (p_status is null or q.status = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (p_is_flagged is null or q.is_flagged = p_is_flagged)
    and (
      p_search is null
      or q.stem ilike '%' || p_search || '%'
      or q.skill_tag ilike '%' || p_search || '%'
      or q.legacy_id ilike '%' || p_search || '%'
    );

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'legacy_id', q.legacy_id,
          'section', q.section,
          'trainer_type', q.trainer_type,
          'question_kind', q.question_kind,
          'status', q.status,
          'difficulty', q.difficulty,
          'skill_tag', q.skill_tag,
          'stem', q.stem,
          'explanation', q.explanation,
          'content', q.content,
          'quality_status', q.quality_status,
          'quality_notes', q.quality_notes,
          'is_flagged', q.is_flagged,
          'flag_count', q.flag_count,
          'replaces_question_id', q.replaces_question_id,
          'created_at', q.created_at,
          'updated_at', q.updated_at
        )
        order by q.created_at desc
      )
    ),
    jsonb_build_object('total', 0, 'rows', '[]'::jsonb)
  )
  into result
  from public.trainer_questions q
  where
    (p_section is null or q.section = p_section)
    and (p_trainer_type is null or q.trainer_type = p_trainer_type)
    and (p_status is null or q.status = p_status)
    and (p_quality_status is null or q.quality_status = p_quality_status)
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (p_is_flagged is null or q.is_flagged = p_is_flagged)
    and (
      p_search is null
      or q.stem ilike '%' || p_search || '%'
      or q.skill_tag ilike '%' || p_search || '%'
      or q.legacy_id ilike '%' || p_search || '%'
    )
  limit p_limit
  offset p_offset;

  return result;
end;
$$;

grant execute on function public.admin_get_trainer_questions(text,text,text,text,text,boolean,text,integer,integer)
  to authenticated;

create or replace function public.admin_get_question_coverage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'by_trainer_type', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select trainer_type,
               count(*)::int as total,
               count(*) filter (where status = 'active')::int as active,
               count(*) filter (where status = 'draft')::int as draft,
               count(*) filter (where status = 'archived')::int as archived
        from public.trainer_questions
        group by trainer_type
        order by trainer_type
      ) t
    ),
    'by_difficulty', (
      select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb)
      from (
        select difficulty,
               count(*)::int as total,
               count(*) filter (where status = 'active')::int as active
        from public.trainer_questions
        group by difficulty
        order by difficulty
      ) d
    ),
    'by_quality_status', (
      select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb)
      from (
        select quality_status, count(*)::int as total
        from public.trainer_questions
        group by quality_status
        order by quality_status
      ) q
    ),
    'by_status', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      from (
        select status, count(*)::int as total
        from public.trainer_questions
        group by status
        order by status
      ) s
    ),
    'flagged_count', (
      select count(*)::int
      from public.trainer_questions
      where is_flagged = true
    )
  )
  into result;

  return result;
end;
$$;

grant execute on function public.admin_get_question_coverage()
  to authenticated;

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
    update public.trainer_questions
    set status = 'archived'
    where id = (
      select replaces_question_id
      from public.trainer_questions
      where id = p_id
    )
    and status = 'active';
  end if;

  update public.trainer_questions
  set status = p_status
  where id = p_id;

  if not found then
    raise exception 'Question not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

grant execute on function public.admin_update_question_status(uuid, text)
  to authenticated;

create or replace function public.admin_duplicate_question_as_draft(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  src public.trainer_questions;
  new_id uuid;
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

  new_id := gen_random_uuid();

  insert into public.trainer_questions (
    id, legacy_id, section, trainer_type, question_kind,
    status, difficulty, skill_tag, stem, explanation,
    content, media, quality_status, quality_notes,
    is_flagged, flag_count, replaces_question_id,
    created_by, updated_by
  ) values (
    new_id,
    null,
    src.section,
    src.trainer_type,
    src.question_kind,
    'draft',
    src.difficulty,
    src.skill_tag,
    src.stem,
    src.explanation,
    src.content,
    src.media,
    'unchecked',
    'Duplicated from ' || coalesce(src.legacy_id, src.id::text),
    false,
    0,
    case when src.status = 'active' then p_id else null end,
    auth.uid(),
    null
  );

  return jsonb_build_object('ok', true, 'new_id', new_id, 'source_id', p_id);
end;
$$;

grant execute on function public.admin_duplicate_question_as_draft(uuid)
  to authenticated;

create or replace function public.admin_get_question_reports(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_count integer;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::integer
  into total_count
  from public.question_reports r
  where (p_status is null or r.status = p_status);

  select coalesce(
    jsonb_build_object(
      'total', total_count,
      'rows', jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'notes', r.notes,
          'status', r.status,
          'created_at', r.created_at,
          'reviewed_at', r.reviewed_at,
          'question_id', q.id,
          'question_legacy_id', q.legacy_id,
          'question_trainer_type', q.trainer_type,
          'question_status', q.status,
          'question_stem', q.stem,
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
  limit p_limit
  offset p_offset;

  return result;
end;
$$;

grant execute on function public.admin_get_question_reports(text, integer, integer)
  to authenticated;

create or replace function public.admin_update_report_status(
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
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  if p_status not in ('reviewed', 'dismissed', 'fixed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.question_reports
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_id;

  if not found then
    raise exception 'Report not found: %', p_id;
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end;
$$;

grant execute on function public.admin_update_report_status(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
