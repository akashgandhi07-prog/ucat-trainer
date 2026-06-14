-- Security hardening (advisor follow-up, June 2026)
--
-- No active vulnerability: every admin_* function already self-checks is_admin and
-- raises for non-admins. This is defence in depth, removing capability that no
-- legitimate caller needs.
--
-- 1) Revoke anon execute on admin-only RPCs. The admin UI calls these as an
--    authenticated admin, so `authenticated` keeps execute; anonymous visitors
--    have no business reaching them at all.
-- 2) Trigger functions should carry no direct execute grant - they fire from
--    triggers regardless. Revoke from everyone.
-- 3) Pin search_path on the two trigger functions flagged as mutable.

revoke execute on function
  public.admin_delete_trainer_question(uuid),
  public.admin_delete_trainer_questions(uuid[]),
  public.admin_duplicate_question_as_draft(uuid),
  public.admin_get_question_coverage(),
  public.admin_get_question_reports(text, integer, integer),
  public.admin_get_trainer_questions(text, text, text, text, text, boolean, text, integer, integer),
  public.admin_import_trainer_question_drafts(jsonb),
  public.admin_send_question_to_review_queue(uuid),
  public.admin_update_question_status(uuid, text),
  public.admin_update_report_status(uuid, text),
  public.admin_update_trainer_question(uuid, text, text, text, jsonb, jsonb)
from anon;

revoke execute on function
  public.apply_review_quality_status(),
  public.increment_question_flag_count()
from anon, authenticated, public;

alter function public.set_updated_at() set search_path = public;
alter function public.prevent_active_question_edit() set search_path = public;
