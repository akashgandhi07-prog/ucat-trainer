-- Performance (Supabase advisor 0001): covering indexes for FK columns without an index.

create index if not exists bug_reports_user_id_fkey_cover_idx on public.bug_reports (user_id);
create index if not exists extra_study_logs_student_id_fkey_cover_idx on public.extra_study_logs (student_id);
create index if not exists mock_scores_student_id_fkey_cover_idx on public.mock_scores (student_id);
create index if not exists plan_days_plan_week_id_fkey_cover_idx on public.plan_days (plan_week_id);
create index if not exists question_feedback_user_id_fkey_cover_idx on public.question_feedback (user_id);
create index if not exists student_invite_links_redeemed_by_student_id_fkey_cover_idx
  on public.student_invite_links (redeemed_by_student_id);
create index if not exists weekly_reflections_student_id_fkey_cover_idx on public.weekly_reflections (student_id);
