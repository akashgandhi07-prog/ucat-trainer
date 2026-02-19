-- Admin usage summary: per-user activity, trainer popularity, guest usage, questions.
-- Single RPC for the admin dashboard; admin-only, SECURITY DEFINER.

create or replace function public.get_admin_usage_summary(since_ts timestamptz default null, until_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
  total_sessions int;
  total_questions bigint;
  active_users int;
  guest_sessions int;
  new_users int;
  trainer_usage jsonb;
  guest_activity jsonb;
  users_arr jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  -- Summary counts
  select count(*)::int into total_sessions
  from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);

  select coalesce(sum(s.total), 0) into total_questions from public.sessions s
  where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts);
  select total_questions + coalesce(sum(ss.total_questions), 0) into total_questions
  from public.syllogism_sessions ss
  where (since_ts is null or ss.created_at >= since_ts) and (until_ts is null or ss.created_at <= until_ts);

  select count(distinct u.user_id)::int into active_users
  from (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
  ) u;

  select count(distinct session_id)::int into guest_sessions
  from public.analytics_events
  where user_id is null
    and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts);

  select count(*)::int into new_users
  from public.profiles p
  where p.created_at is not null
    and (since_ts is null or p.created_at >= since_ts) and (until_ts is null or p.created_at <= until_ts);

  -- Trainer usage (sessions table + syllogism by mode)
  select jsonb_build_object(
    'speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'calculator', (select count(*)::int from public.sessions where training_type = 'calculator' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_micro', (select count(*)::int from public.syllogism_sessions where mode = 'micro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)),
    'syllogism_macro', (select count(*)::int from public.syllogism_sessions where mode = 'macro' and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts))
  ) into trainer_usage;

  -- Guest activity: event_name -> count
  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into guest_activity
  from (
    select event_name, count(*)::int as cnt
    from public.analytics_events
    where user_id is null
      and (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by event_name
  ) t;

  -- Per-user rows
  with active_user_ids as (
    select user_id from public.sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    union
    select user_id from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
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
      max(s.created_at) as last_sess
    from public.sessions s
    where (since_ts is null or s.created_at >= since_ts) and (until_ts is null or s.created_at <= until_ts)
    group by s.user_id
  ),
  user_syll as (
    select
      user_id,
      count(*) filter (where mode = 'micro') as syllogism_micro,
      count(*) filter (where mode = 'macro') as syllogism_macro,
      coalesce(sum(total_questions), 0) as syllogism_questions,
      max(created_at) as last_syll
    from public.syllogism_sessions
    where (since_ts is null or created_at >= since_ts) and (until_ts is null or created_at <= until_ts)
    group by user_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', u.user_id,
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
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by (coalesce(us.session_questions, 0) + coalesce(sy.syllogism_questions, 0)) desc nulls last
  ), '[]'::jsonb) into users_arr
  from active_user_ids u
  left join public.profiles p on p.id = u.user_id
  left join user_sess us on us.user_id = u.user_id
  left join user_syll sy on sy.user_id = u.user_id;

  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sessions', total_sessions,
      'total_questions', total_questions,
      'active_users', active_users,
      'guest_sessions', guest_sessions,
      'new_users', new_users
    ),
    'trainer_usage', trainer_usage,
    'guest_activity', guest_activity,
    'users', users_arr
  );
  return result;
end;
$$;

comment on function public.get_admin_usage_summary(timestamptz, timestamptz) is
  'Returns usage summary, trainer counts, guest activity, and per-user activity for admin dashboard. Admin only.';

-- Ensure get_admin_stats returns mental_maths for consistency with full schema
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
    'sessions_mental_maths', (select count(*)::int from public.sessions where training_type = 'mental_maths'
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
