create index if not exists plan_sessions_plan_day_idx
  on public.plan_sessions (plan_id, day_date);
create index if not exists plan_days_plan_date_idx on public.plan_days (plan_id, day_date);
create index if not exists extra_study_plan_day_idx on public.extra_study_logs (plan_id, day_date);
create index if not exists mock_scores_plan_logged_idx on public.mock_scores (plan_id, logged_date);
create index if not exists weekly_ref_plan_week_idx on public.weekly_reflections (plan_id, week_number);
create index if not exists plan_members_user_idx on public.plan_members (user_id);
create index if not exists plans_student_id_idx on public.plans (student_id);
create index if not exists plans_tutor_id_idx on public.plans (tutor_id);
create index if not exists plan_sessions_plan_day_id_idx on public.plan_sessions (plan_day_id);
create index if not exists mock_scores_session_id_idx on public.mock_scores (session_id);
create index if not exists session_completions_student_id_idx on public.session_completions (student_id);

drop trigger if exists set_updated_at on public.plan_weeks;
create trigger set_updated_at before update on public.plan_weeks
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plan_days;
create trigger set_updated_at before update on public.plan_days
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.plan_sessions;
create trigger set_updated_at before update on public.plan_sessions
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.extra_study_logs;
create trigger set_updated_at before update on public.extra_study_logs
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.weekly_reflections;
create trigger set_updated_at before update on public.weekly_reflections
  for each row execute function public.set_updated_at();
