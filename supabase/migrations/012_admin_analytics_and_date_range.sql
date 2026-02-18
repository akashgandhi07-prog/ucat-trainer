-- Admin stats with optional date range; analytics summary RPC for admin dashboard.

-- 1) get_admin_stats with optional since_ts, until_ts (null = all time)
create or replace function public.get_admin_stats(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_calculator', (select count(*)::int from public.sessions where training_type = 'calculator'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'sessions_inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_sessions_count', (select count(*)::int from public.syllogism_sessions
      where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion'
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats(timestamptz, timestamptz) is
  'Returns aggregate stats for admin dashboard, optionally filtered by date range. Admin only.';

-- 2) get_analytics_summary(since_ts, until_ts) — admin-only aggregated analytics
create or replace function public.get_analytics_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  event_counts jsonb;
  by_day jsonb;
  trainer_by_type jsonb;
  funnel jsonb;
  unique_sessions int;
  unique_users int;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb)
  into event_counts
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  with funnel_raw as (
    select event_properties->>'training_type' as tt, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_name in ('trainer_opened', 'trainer_started', 'trainer_completed', 'trainer_abandoned')
    group by event_properties->>'training_type', event_name
  )
  select coalesce(jsonb_object_agg(tt, funnel_obj), '{}'::jsonb)
  into funnel
  from (
    select tt, jsonb_object_agg(event_name, c) as funnel_obj
    from funnel_raw
    group by tt
  ) f;

  with day_events as (
    select date_trunc('day', created_at)::date as d, event_name, count(*)::int as c
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by date_trunc('day', created_at)::date, event_name
  ),
  days_agg as (
    select d, jsonb_object_agg(event_name, c) as events
    from day_events
    group by d
  )
  select coalesce(jsonb_agg(jsonb_build_object('date', d, 'events', events) order by d), '[]'::jsonb)
  into by_day
  from days_agg;

  select coalesce(jsonb_object_agg(training_type, cnt), '{}'::jsonb)
  into trainer_by_type
  from (
    select event_properties->>'training_type' as training_type, count(*)::int as cnt
    from public.analytics_events
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
      and event_properties ? 'training_type'
      and event_properties->>'training_type' is not null
      and event_properties->>'training_type' <> ''
    group by event_properties->>'training_type'
  ) t;

  select count(distinct session_id)::int into unique_sessions
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(distinct user_id)::int into unique_users
  from public.analytics_events
  where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    and user_id is not null;

  return jsonb_build_object(
    'event_counts', event_counts,
    'by_day', by_day,
    'trainer_by_type', trainer_by_type,
    'funnel', funnel,
    'unique_sessions', unique_sessions,
    'unique_users', unique_users
  );
end;
$$;

comment on function public.get_analytics_summary(timestamptz, timestamptz) is
  'Returns aggregated analytics events for admin dashboard (event counts, by day, trainer by type, unique sessions/users). Admin only.';
