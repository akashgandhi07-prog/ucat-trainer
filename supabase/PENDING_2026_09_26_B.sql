-- Pending 26 September 2026 migration (batch B) for the UCAT trainer + planner.
-- Paste this whole file into the Supabase SQL editor for project qhhmcsdteqcuhvdqhkfo
-- (https://supabase.com/dashboard/project/qhhmcsdteqcuhvdqhkfo/sql/new) and run it once.
-- Idempotent, so running it again is safe. Safe to run before or after the matching
-- frontend deploy (function signatures and existing output keys are unchanged; the
-- admin page zero-fills syllogism_foundation until this is applied).
-- Requires 20260926120000_admin_trainer_type_breakdown.sql (already live).
-- Generated from supabase/migrations on 2026-09-26:
--   20260926150000_admin_syllogism_foundation.sql

begin;

-- ========== 20260926150000_admin_syllogism_foundation.sql ==========
-- Admin per-trainer breakdown: add the syllogism foundations trainer.
--
-- 20260926120000_admin_trainer_type_breakdown broke syllogism_sessions out by
-- mode but only for mode in ('micro', 'macro'). SyllogismFoundationPage writes
-- mode = 'foundation' (about 957 rows in prod on 2026-09-26); those rows counted
-- in every total (questions, time, days active) but had no per-trainer column,
-- so the per-trainer figures did not add up to the totals.
--
-- Bodies are the live definitions (2026-09-26, prosrc identical to
-- 20260926120000) with only these additions:
--   get_admin_usage_summary(since_ts, until_ts)
--     trainer_usage / trainer_questions / trainer_time_seconds + syllogism_foundation
--     users[] + syllogism_foundation (session count)
--   get_admin_new_users(since_ts, until_ts, limit_rows)
--     [] + syllogism_foundation
--   get_admin_registrations_overview(limit_rows)
--     [] + syllogism_foundation
--     [].trainer_questions / [].trainer_time_seconds + syllogism_foundation
-- Every existing key keeps its meaning. get_admin_stats has no syllogism mode
-- breakdown and is untouched.
--
-- Same signatures, security definer, search_path = '', admin check and grants.
-- Idempotent: create or replace + re-issued grants.

-- ---------------------------------------------------------------------------
-- get_admin_usage_summary(since_ts, until_ts)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_usage_summary(
  since_ts timestamp with time zone default null,
  until_ts timestamp with time zone default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  is_admin boolean;
  result jsonb;
  total_sessions int;
  v_total_questions bigint;
  active_users int;
  guest_sessions int;
  new_users int;
  v_total_time_seconds bigint;
  trainer_usage jsonb;
  trainer_questions jsonb;
  trainer_time_seconds jsonb;
  guest_activity jsonb;
  users_arr jsonb;
  -- Original eight keys plus syllogism_foundation, always present (zero when unused).
  legacy_zero constant jsonb := jsonb_build_object(
    'speed_reading', 0, 'rapid_recall', 0, 'keyword_scanning', 0, 'calculator', 0,
    'inference_trainer', 0, 'mental_maths', 0, 'syllogism_micro', 0, 'syllogism_macro', 0,
    'syllogism_foundation', 0
  );
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select count(*)::int into total_sessions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select coalesce(sum(s.total), 0) into v_total_questions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select v_total_questions + coalesce(sum(ss.total_questions), 0) into v_total_questions
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select count(distinct u.user_id)::int into active_users from (
    select user_id from public.sessions where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ) u;

  select (
    coalesce((select count(distinct session_id)::int from public.analytics_events
      where user_id is null and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)), 0)
    + coalesce((select sum(distinct_sessions)::int from public.analytics_events_daily
      where is_guest and (since_ts is null or day >= since_ts::date) and (until_ts is null or day <= until_ts::date)), 0)
  ) into guest_sessions;

  select count(*)::int into new_users from public.profiles p
  where p.created_at is not null and (since_ts is null or p.created_at >= since_ts) and (until_ts is null or p.created_at <= until_ts);

  select coalesce(sum(coalesce(s.time_seconds, 0)), 0) into v_total_time_seconds from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select v_total_time_seconds + coalesce(sum((ss.average_time_per_decision * ss.total_questions)::bigint), 0) into v_total_time_seconds
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  -- Per-trainer sessions / questions / time: every sessions.training_type plus
  -- the three syllogism modes.
  with per_trainer as (
    select s.training_type as k,
      count(*)::int as n,
      coalesce(sum(s.total), 0)::bigint as q,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0)::bigint as secs
    from public.sessions s
    where s.training_type is not null
      and (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.training_type
    union all
    select 'syllogism_' || ss.mode as k,
      count(*)::int as n,
      coalesce(sum(ss.total_questions), 0)::bigint as q,
      coalesce(sum((ss.average_time_per_decision * ss.total_questions)::bigint), 0)::bigint as secs
    from public.syllogism_sessions ss
    where ss.mode in ('foundation', 'micro', 'macro')
      and (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts)
    group by ss.mode
  )
  select
    legacy_zero || coalesce(jsonb_object_agg(k, n), '{}'::jsonb),
    legacy_zero || coalesce(jsonb_object_agg(k, q), '{}'::jsonb),
    legacy_zero || coalesce(jsonb_object_agg(k, secs), '{}'::jsonb)
  into trainer_usage, trainer_questions, trainer_time_seconds
  from per_trainer;

  with combined as (
    select event_name, 1::bigint as c from public.analytics_events
    where user_id is null and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union all
    select event_name, event_count as c from public.analytics_events_daily
    where is_guest and (since_ts is null or day >= since_ts::date) and (until_ts is null or day <= until_ts::date)
  )
  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into guest_activity
  from (select event_name, sum(c)::int as cnt from combined group by event_name) t;

  with active_user_ids as (
    select user_id from public.sessions where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ),
  user_sess as (
    select s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0) as total_session_seconds,
      (array_agg(s.wpm order by s.created_at desc) filter (where s.training_type = 'speed_reading' and s.wpm is not null))[1] as last_wpm,
      avg(s.wpm) filter (where s.training_type = 'speed_reading' and s.wpm is not null) as avg_wpm,
      max(s.created_at) as last_sess
    from public.sessions s
    where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.user_id
  ),
  user_type as (
    select t.user_id, jsonb_object_agg(t.training_type, t.n) as sessions_by_type
    from (
      select s.user_id, s.training_type, count(*)::int as n
      from public.sessions s
      where s.training_type is not null
        and (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
      group by s.user_id, s.training_type
    ) t
    group by t.user_id
  ),
  user_syll as (
    select user_id,
      count(*) filter (where mode = 'foundation') as syllogism_foundation,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) as syllogism_seconds,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by user_id
  ),
  user_days as (
    select user_id, count(distinct d)::int as days_active from (
      select user_id, date(created_at) as d from public.sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      union
      select user_id, date(created_at) as d from public.syllogism_sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    ) t group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.user_id,
      'email', coalesce(trim(p.email), ''),
      'display_name', coalesce(nullif(trim(p.full_name), ''), nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' '), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'sessions_by_type', coalesce(ut.sessions_by_type, '{}'::jsonb),
      'syllogism_foundation', coalesce(sy.syllogism_foundation, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)) desc nulls last
  ), '[]'::jsonb) into users_arr
  from active_user_ids u
  left join public.profiles p on p.id = u.user_id
  left join user_sess us on us.user_id = u.user_id
  left join user_type ut on ut.user_id = u.user_id
  left join user_syll sy on sy.user_id = u.user_id
  left join user_days ud on ud.user_id = u.user_id;

  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sessions', total_sessions,
      'total_questions', v_total_questions,
      'total_time_seconds', v_total_time_seconds,
      'active_users', active_users,
      'guest_sessions', guest_sessions,
      'new_users', new_users
    ),
    'trainer_usage', trainer_usage,
    'trainer_questions', trainer_questions,
    'trainer_time_seconds', trainer_time_seconds,
    'guest_activity', guest_activity,
    'users', users_arr
  );
  return result;
end;
$function$;

revoke all on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) from public, anon;
grant execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) to authenticated;

-- ---------------------------------------------------------------------------
-- get_admin_new_users(since_ts, until_ts, limit_rows)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_new_users(
  since_ts timestamp with time zone default null,
  until_ts timestamp with time zone default null,
  limit_rows integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  is_admin boolean;
  result jsonb;
  retained_from timestamp with time zone;
begin
  select (role = 'admin') into is_admin
  from public.profiles
  where id = auth.uid();

  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  -- Earliest raw row still present. Cheap: analytics_events_name_created /
  -- analytics_events_user_created are btree indexes that include created_at, and
  -- the planner uses an index-ordered scan for min().
  select min(created_at) into retained_from from public.analytics_events;

  with new_profiles as (
    select id, full_name, first_name, last_name, created_at, email
    from public.profiles
    where (since_ts is null or created_at >= since_ts)
      and (until_ts is null or created_at <= until_ts)
    order by created_at desc
    limit limit_rows
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct
    from public.sessions s
    where s.user_id in (select id from new_profiles)
    group by s.user_id
  ),
  user_type as (
    select t.user_id, jsonb_object_agg(t.training_type, t.n) as sessions_by_type
    from (
      select s.user_id, s.training_type, count(*)::int as n
      from public.sessions s
      where s.training_type is not null
        and s.user_id in (select id from new_profiles)
      group by s.user_id, s.training_type
    ) t
    group by t.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'foundation') as syllogism_foundation,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions
    from public.syllogism_sessions
    where user_id in (select id from new_profiles)
    group by user_id
  ),
  user_events as (
    select
      user_id,
      coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) as event_counts
    from (
      select user_id, event_name, count(*)::int as cnt
      from public.analytics_events
      where user_id is not null
        and user_id in (select id from new_profiles)
      group by user_id, event_name
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'full_name', coalesce(
        nullif(trim(p.full_name), ''),
        nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' ')
      , ''),
      'created_at', p.created_at,
      'email', coalesce(trim(p.email), ''),
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'sessions_by_type', coalesce(ut.sessions_by_type, '{}'::jsonb),
      'syllogism_foundation', coalesce(sy.syllogism_foundation, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'event_counts', coalesce(ue.event_counts, '{}'::jsonb),
      'event_counts_since', retained_from,
      'event_counts_partial', (retained_from is not null and p.created_at < retained_from)
    ) order by p.created_at desc
  ), '[]'::jsonb) into result
  from new_profiles p
  left join user_sess us on us.user_id = p.id
  left join user_type ut on ut.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_events ue on ue.user_id = p.id;

  return result;
end;
$function$;

revoke all on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) from public, anon;
grant execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- get_admin_registrations_overview(limit_rows)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_registrations_overview(limit_rows integer default 5000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  is_admin boolean;
  result jsonb;
  -- Original eight keys plus syllogism_foundation, always present (zero when unused).
  legacy_zero constant jsonb := jsonb_build_object(
    'speed_reading', 0, 'rapid_recall', 0, 'keyword_scanning', 0, 'calculator', 0,
    'inference_trainer', 0, 'mental_maths', 0, 'syllogism_micro', 0, 'syllogism_macro', 0,
    'syllogism_foundation', 0
  );
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  with profiles_base as (
    select
      id,
      created_at,
      full_name,
      first_name,
      last_name,
      email,
      stream,
      entry_year
    from public.profiles
    order by created_at desc nulls last
    limit coalesce(limit_rows, 5000)
  ),
  user_sess as (
    select
      s.user_id,
      count(*) filter (where s.training_type = 'speed_reading') as speed_reading,
      count(*) filter (where s.training_type = 'rapid_recall') as rapid_recall,
      count(*) filter (where s.training_type = 'keyword_scanning') as keyword_scanning,
      count(*) filter (where s.training_type = 'calculator') as calculator,
      count(*) filter (where s.training_type = 'inference_trainer') as inference_trainer,
      count(*) filter (where s.training_type = 'mental_maths') as mental_maths,
      coalesce(sum(s.total), 0) as session_questions,
      coalesce(sum(s.correct), 0) as session_correct,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0) as total_session_seconds,
      (array_agg(s.wpm order by s.created_at desc) filter (where s.training_type = 'speed_reading' and s.wpm is not null))[1] as last_wpm,
      avg(s.wpm) filter (where s.training_type = 'speed_reading' and s.wpm is not null) as avg_wpm,
      max(s.created_at) as last_sess
    from public.sessions s
    where s.user_id in (select id from profiles_base)
    group by s.user_id
  ),
  -- Per user and trainer (every training_type plus the three syllogism modes).
  user_trainer as (
    select s.user_id, s.training_type as k,
      count(*)::int as n,
      coalesce(sum(s.total), 0)::bigint as q,
      coalesce(sum(coalesce(s.time_seconds, 0)), 0)::bigint as secs,
      true as is_session
    from public.sessions s
    where s.training_type is not null
      and s.user_id in (select id from profiles_base)
    group by s.user_id, s.training_type
    union all
    select ss.user_id, 'syllogism_' || ss.mode as k,
      count(*)::int as n,
      coalesce(sum(ss.total_questions), 0)::bigint as q,
      coalesce(sum((ss.average_time_per_decision * ss.total_questions)::bigint), 0)::bigint as secs,
      false as is_session
    from public.syllogism_sessions ss
    where ss.mode in ('foundation', 'micro', 'macro')
      and ss.user_id in (select id from profiles_base)
    group by ss.user_id, ss.mode
  ),
  user_trainer_json as (
    select user_id,
      coalesce(jsonb_object_agg(k, n) filter (where is_session), '{}'::jsonb) as sessions_by_type,
      jsonb_object_agg(k, q) as trainer_questions,
      jsonb_object_agg(k, secs) as trainer_time_seconds
    from user_trainer
    group by user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'foundation') as syllogism_foundation,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      coalesce(sum((average_time_per_decision * total_questions)::bigint), 0) as syllogism_seconds,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where user_id in (select id from profiles_base)
    group by user_id
  ),
  user_days as (
    select user_id, count(distinct d)::int as days_active
    from (
      select user_id, date(created_at) as d
      from public.sessions
      where user_id in (select id from profiles_base)
      union
      select user_id, date(created_at) as d
      from public.syllogism_sessions
      where user_id in (select id from profiles_base)
    ) t
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'email', coalesce(trim(p.email), ''),
      'display_name', coalesce(
        nullif(trim(p.full_name), ''),
        nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' ')
      , ''),
      'stream', p.stream,
      'entry_year', p.entry_year,
      'created_at', p.created_at,
      'speed_reading', coalesce(us.speed_reading, 0),
      'rapid_recall', coalesce(us.rapid_recall, 0),
      'keyword_scanning', coalesce(us.keyword_scanning, 0),
      'calculator', coalesce(us.calculator, 0),
      'inference_trainer', coalesce(us.inference_trainer, 0),
      'mental_maths', coalesce(us.mental_maths, 0),
      'sessions_by_type', coalesce(ut.sessions_by_type, '{}'::jsonb),
      'syllogism_foundation', coalesce(sy.syllogism_foundation, 0),
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'trainer_questions', legacy_zero || coalesce(ut.trainer_questions, '{}'::jsonb),
      'trainer_time_seconds', legacy_zero || coalesce(ut.trainer_time_seconds, '{}'::jsonb),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by p.created_at desc nulls last
  ), '[]'::jsonb) into result
  from profiles_base p
  left join user_sess us on us.user_id = p.id
  left join user_trainer_json ut on ut.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_days ud on ud.user_id = p.id;

  return result;
end;
$function$;

revoke all on function public.get_admin_registrations_overview(integer) from public, anon;
grant execute on function public.get_admin_registrations_overview(integer) to authenticated;

commit;

notify pgrst, 'reload schema';
