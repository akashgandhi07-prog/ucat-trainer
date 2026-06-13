-- Fix: Conversions trainer sessions were silently lost.
--
-- The client logs training_type 'unit_conversions' (src/utils/analyticsStorage.ts
-- saveConversionSession, src/types/session.ts, guestSessions.ts) but
-- sessions_training_type_check never included it, so every signed-in save failed
-- the check constraint (0 rows ever, vs 989 sessions across the 6 allowed types).
-- Worse, one guest unit_conversions row made the entire guest-history batch insert
-- fail on sign-in ("Couldn't sync your guest history").

alter table public.sessions
  drop constraint sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text
  ]));
