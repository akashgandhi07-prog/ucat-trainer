-- Session logging integrity (trainer audit, June 2026)
--
-- 1) client_session_id: trainers save from several paths (auto-save, manual save,
--    pagehide) and ~25% of speed-reading rows were near-duplicate twins. Clients now
--    send a per-drill uuid and upsert on (user_id, client_session_id), so retries and
--    duplicate code paths update one row instead of inserting twins. Legacy rows keep
--    NULL (NULLS DISTINCT, so the unique index ignores them).
-- 2) kps / avg_ms: the wpm column was triple-purposed (speed reading wpm, calculator
--    keystrokes-per-second, mental maths avg ms per question), which made aggregate
--    charts mix units. Each metric now has its own column; old rows are backfilled.

alter table public.sessions add column if not exists client_session_id uuid;
alter table public.sessions add column if not exists kps numeric;
alter table public.sessions add column if not exists avg_ms integer;

create unique index if not exists sessions_user_client_session_uidx
  on public.sessions (user_id, client_session_id);

-- Backfill repurposed wpm values into their own columns.
update public.sessions set kps = wpm, wpm = null
  where training_type = 'calculator' and wpm is not null;
update public.sessions set avg_ms = wpm, wpm = null
  where training_type = 'mental_maths' and wpm is not null;
