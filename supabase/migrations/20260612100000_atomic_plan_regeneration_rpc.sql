-- Atomic plan regeneration.
--
-- regenerateFutureWeeks previously issued ~6 sequential statements from the browser
-- (delete sessions, delete days, delete weeks, insert weeks, insert days, insert
-- sessions). A network drop or crash mid-sequence left the plan corrupted - old weeks
-- deleted, new ones never written. This RPC performs the whole swap in one
-- transaction and one round trip.
--
-- SECURITY INVOKER: every statement still runs as the calling user, so the existing
-- RLS policies on plan_weeks/plan_days/plan_sessions keep enforcing plan ownership.
-- plan_id on inserted rows is forced to p_plan_id so a malformed payload can never
-- write into another plan even before RLS is consulted.

create or replace function public.apply_plan_regeneration(
  p_plan_id uuid,
  p_dates_to_clear date[],
  p_week_ids_to_delete uuid[],
  p_new_weeks jsonb default '[]'::jsonb,
  p_new_days jsonb default '[]'::jsonb,
  p_new_sessions jsonb default '[]'::jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_dates_to_clear is not null and array_length(p_dates_to_clear, 1) > 0 then
    delete from plan_sessions where plan_id = p_plan_id and day_date = any(p_dates_to_clear);
    delete from plan_days     where plan_id = p_plan_id and day_date = any(p_dates_to_clear);
  end if;

  if p_week_ids_to_delete is not null and array_length(p_week_ids_to_delete, 1) > 0 then
    delete from plan_weeks where plan_id = p_plan_id and id = any(p_week_ids_to_delete);
  end if;

  insert into plan_weeks
    (id, plan_id, week_number, week_start, week_type, default_hours, difficulty_rating, is_locked, tutor_note)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'week_number')::int,
    (r->>'week_start')::date,
    coalesce(r->>'week_type', 'school'),
    coalesce((r->>'default_hours')::numeric, 2.0),
    (r->>'difficulty_rating')::smallint,
    coalesce((r->>'is_locked')::boolean, false),
    r->>'tutor_note'
  from jsonb_array_elements(coalesce(p_new_weeks, '[]'::jsonb)) r;

  insert into plan_days
    (id, plan_id, plan_week_id, day_date, availability, custom_hours, is_rest)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'plan_week_id')::uuid,
    (r->>'day_date')::date,
    coalesce(r->>'availability', 'available'),
    (r->>'custom_hours')::numeric,
    coalesce((r->>'is_rest')::boolean, false)
  from jsonb_array_elements(coalesce(p_new_days, '[]'::jsonb)) r;

  insert into plan_sessions
    (id, plan_id, plan_day_id, day_date, session_type, duration_minutes, position, is_timed, notes, planner_rationale)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'plan_day_id')::uuid,
    (r->>'day_date')::date,
    r->>'session_type',
    coalesce((r->>'duration_minutes')::int, 60),
    coalesce((r->>'position')::int, 0),
    coalesce((r->>'is_timed')::boolean, false),
    r->>'notes',
    r->>'planner_rationale'
  from jsonb_array_elements(coalesce(p_new_sessions, '[]'::jsonb)) r;
end;
$$;

revoke all on function public.apply_plan_regeneration(uuid, date[], uuid[], jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.apply_plan_regeneration(uuid, date[], uuid[], jsonb, jsonb, jsonb) to authenticated, service_role;
