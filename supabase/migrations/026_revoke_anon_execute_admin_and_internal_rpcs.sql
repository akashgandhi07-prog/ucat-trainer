-- Advisor 0028: anon could EXECUTE SECURITY DEFINER RPCs exposed via PostgREST.
-- Admin RPCs already enforce profiles.role = 'admin' but should not be callable without a session.
-- student_invite_token_valid(text) stays callable for anon (unauthenticated /join/[token] page).
-- consume_student_invite: authenticated only (invite consumption after login / API with session).
-- trigger_mailchimp_on_signup: no API EXECUTE (auth trigger runs as function owner).
-- handle_auth_user_profiles_planner_sync: service_role only (same as 024_planner_unified_plan_sessions).

-- Admin dashboard RPCs: authenticated only
revoke execute on function public.get_admin_stats() from public, anon;
revoke execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) from public, anon;

revoke execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) from public, anon;

revoke execute on function public.get_admin_registrations_overview(integer) from public, anon;

revoke execute on function public.consume_student_invite(text) from public, anon;

revoke execute on function public.trigger_mailchimp_on_signup() from public, anon, authenticated;

revoke execute on function public.handle_auth_user_profiles_planner_sync() from public, anon, authenticated;

grant execute on function public.get_admin_stats() to authenticated;
grant execute on function public.get_admin_stats(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_analytics_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_usage_summary(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_admin_new_users(timestamp with time zone, timestamp with time zone, integer) to authenticated;
grant execute on function public.get_admin_registrations_overview(integer) to authenticated;
grant execute on function public.consume_student_invite(text) to authenticated;

grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;
