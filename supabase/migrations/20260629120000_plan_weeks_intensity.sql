-- Per-week study intensity.
--
-- Students told us a fixed plan feels either too easy or too brutal depending on the
-- week. This adds a per-week effort dial the student sets at the start of each week:
--   lighter  → ease off a tough week
--   standard → the plan as generated (default)
--   harder   → push this week's load up
--
-- The engine reads this back during regeneration (see regenerateFutureWeeks) and
-- multiplies the week's daily minutes by a factor mapped from the label, so a single
-- week can be dialled up or down without changing the student's overall stated hours.

alter table public.plan_weeks
  add column if not exists intensity text not null default 'standard'
    check (intensity in ('lighter', 'standard', 'harder'));

comment on column public.plan_weeks.intensity is
  'Student-chosen effort level for the week: lighter | standard | harder. Drives a per-week minutes multiplier in the plan engine.';

-- The atomic regeneration RPC inserts plan_weeks with an explicit column list, so it
-- must carry intensity through too — otherwise every regenerate would reset weeks to
-- the column default and silently drop the student's choices. Re-create it verbatim
-- with intensity added to the plan_weeks insert.
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
    (id, plan_id, week_number, week_start, week_type, default_hours, difficulty_rating, intensity, is_locked, tutor_note)
  select
    (r->>'id')::uuid,
    p_plan_id,
    (r->>'week_number')::int,
    (r->>'week_start')::date,
    coalesce(r->>'week_type', 'school'),
    coalesce((r->>'default_hours')::numeric, 2.0),
    (r->>'difficulty_rating')::smallint,
    coalesce(r->>'intensity', 'standard'),
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
