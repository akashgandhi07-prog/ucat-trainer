-- Extend get_admin_stats to include calculator, inference_trainer, and syllogism session counts.
create or replace function public.get_admin_stats()
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
    'total_sessions', (select count(*)::int from public.sessions),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'sessions_calculator', (select count(*)::int from public.sessions where training_type = 'calculator'),
    'sessions_inference_trainer', (select count(*)::int from public.sessions where training_type = 'inference_trainer'),
    'syllogism_sessions_count', (select count(*)::int from public.syllogism_sessions),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion')
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is
  'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';
