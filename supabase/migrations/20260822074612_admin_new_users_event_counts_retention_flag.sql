-- get_admin_new_users: document the 7-day raw-retention limit on per-user event_counts.
--
-- Context: analytics_events raw retention was cut from 90 to 7 days (pg_cron job
-- analytics-events-rollup now runs rollup_analytics_events(7)). The rollup table
-- analytics_events_daily has grain (day, event_name, is_guest, training_type) and
-- carries NO user_id, so per-user event counts can only ever come from the raw rows.
--
-- The admin UI (AdminPage, default range = last 30 days) shows every sign-up in the
-- range with "Page views: N; Drill started: N" taken from event_counts. For a user who
-- signed up more than 7 days ago those counts now silently cover only the last 7 days
-- (usually empty), while the drill/session columns (from public.sessions and
-- public.syllogism_sessions, which are not pruned) stay complete.
--
-- This version keeps the signature and the top-level JSON shape (a jsonb ARRAY of
-- rows) unchanged and adds two OPTIONAL per-row fields that the UI uses to label
-- the counts honestly:
--   event_counts_since   timestamptz  earliest raw analytics row still retained
--                                     (null when the raw table is empty)
--   event_counts_partial boolean      true when the profile was created before
--                                     event_counts_since, i.e. the counts do not
--                                     cover the user's full lifetime
--
-- Apply with: supabase db push / SQL editor on project qhhmcsdteqcuhvdqhkfo.
-- APPLIED 2026-08-22 via Supabase MCP (admin_new_users_event_counts_retention_flag). Safe to re-run.

create or replace function public.get_admin_new_users(
  since_ts timestamp with time zone default null::timestamp with time zone,
  until_ts timestamp with time zone default null::timestamp with time zone,
  limit_rows integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
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
  user_syll as (
    select
      user_id,
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
      'syllogism_micro', coalesce(sy.syllogism_micro, 0),
      'syllogism_macro', coalesce(sy.syllogism_macro, 0),
      'total_questions', (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)),
      'session_correct', coalesce(us.session_correct, 0),
      'event_counts', coalesce(ue.event_counts, '{}'::jsonb),
      -- Raw analytics retention is 7 days; the rollup has no user grain.
      'event_counts_since', retained_from,
      'event_counts_partial', (retained_from is not null and p.created_at < retained_from)
    ) order by p.created_at desc
  ), '[]'::jsonb) into result
  from new_profiles p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_events ue on ue.user_id = p.id;

  return result;
end;
$function$;

comment on function public.get_admin_new_users(timestamptz, timestamptz, int) is
  'Admin-only. New profiles in [since_ts, until_ts] (limit_rows) with drill/session totals and per-user analytics event_counts. event_counts come from RAW analytics_events only (7-day retention; the daily rollup has no user_id), so event_counts_since / event_counts_partial flag rows whose counts do not cover the full lifetime.';
