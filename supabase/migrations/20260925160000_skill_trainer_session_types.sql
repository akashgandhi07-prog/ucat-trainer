-- Register the four SkillTrainerShell trainers in `sessions`.
--
-- QR Setup, QR Data Extraction, QR Estimation and the DM Constraint Builder now log a
-- run-level row to public.sessions (src/hooks/useSkillTrainerRunLog.ts via
-- src/lib/trainerSessionLog.ts), alongside their per-item rows in
-- skill_trainer_attempts. That puts them on the Dashboard, the sidebar streak, the
-- weekly summary email and admin totals, like every established trainer.
--
-- sessions_training_type_check must allow the new values or every signed-in save
-- fails (see 20260612120000_allow_unit_conversions_sessions.sql). Until this runs the
-- client keeps the rejected runs on the device and uploads them afterwards.
--
-- Allowed list = the latest definition (20260612140000_vr_passage_sets_and_not_except.sql:
-- 8 values) plus the 4 new ones. Idempotent: safe to run more than once.
--
-- Consumers checked: weekly_summary_data (20260617120000) sums correct/total
-- and time_seconds over ALL sessions rows without filtering training_type, so it needs
-- no change. Admin RPCs count total_sessions over all rows; their per-type columns only
-- cover the six original trainers (unit_conversions and not_except are not broken out
-- either), so they are left unchanged here. No table is created, so no grants change.

alter table public.sessions
  drop constraint if exists sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text,
    'not_except'::text,
    'qr_setup'::text,
    'qr_data_extraction'::text,
    'qr_estimation'::text,
    'dm_constraints'::text
  ]));
