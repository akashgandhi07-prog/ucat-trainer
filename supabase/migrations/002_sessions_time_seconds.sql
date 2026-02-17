-- Optional time_seconds for keyword_scanning (and rapid_recall) sessions.
-- Run in Supabase SQL editor or via Supabase CLI.

alter table public.sessions
  add column if not exists time_seconds integer;

comment on column public.sessions.time_seconds is 'Duration in seconds (e.g. scan time for keyword_scanning, reading window for rapid_recall).';
