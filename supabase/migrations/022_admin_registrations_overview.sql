-- Admin registrations overview: all profiles with usage aggregates.
-- Admin-only, SECURITY DEFINER. Used by the admin dashboard to list
-- all registrations (students) with what they have been using.

create or replace function public.get_admin_registrations_overview(limit_rows int default 5000)
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

  with profiles_base as (
    select
      id,
      created_at,
      full_name,
      first_name,
      last_name,
      email
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
  user_syll as (
    select
      user_id,
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
      'created_at', p.created_at,
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
      'session_questions', coalesce(us.session_questions, 0),
      'total_time_seconds', (coalesce(us.total_session_seconds, 0) + coalesce(sy.syllogism_seconds, 0)),
      'days_active', coalesce(ud.days_active, 0),
      'last_wpm', us.last_wpm,
      'avg_wpm', us.avg_wpm,
      'last_active_at', greatest(us.last_sess, sy.last_syll)
    ) order by p.created_at desc nulls last
  ), '[]'::jsonb) into result
  from profiles_base p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_days ud on ud.user_id = p.id;

  return result;
end;
$$;

comment on function public.get_admin_registrations_overview(int) is
  'Returns all registrations (profiles) with per-trainer usage and totals across all time. Admin only.';

