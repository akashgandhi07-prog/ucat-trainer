-- New users by signup date with full name and activity (what they looked at and did).
-- Admin-only. Used by admin dashboard "New users by date" section.

create or replace function public.get_admin_new_users(
  since_ts timestamptz default null,
  until_ts timestamptz default null,
  limit_rows int default 300
)
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
      'full_name', coalesce(nullif(trim(p.full_name), ''), nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' '), ''),
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
      'event_counts', coalesce(ue.event_counts, '{}'::jsonb)
    ) order by p.created_at desc
  ), '[]'::jsonb) into result
  from new_profiles p
  left join user_sess us on us.user_id = p.id
  left join user_syll sy on sy.user_id = p.id
  left join user_events ue on ue.user_id = p.id;

  return result;
end;
$$;

comment on function public.get_admin_new_users(timestamptz, timestamptz, int) is
  'Returns new users by signup date (full name, email, activity). Admin only.';