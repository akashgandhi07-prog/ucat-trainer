alter table public.session_completions
add column if not exists minutes_completed integer not null default 0 check (minutes_completed >= 0);
