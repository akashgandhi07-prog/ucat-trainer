-- Security: add length/size constraints to profiles and analytics_events to prevent DoS and storage abuse.
-- Run after ensuring existing data complies (e.g. truncate oversize values if any).

-- Profiles
alter table public.profiles drop constraint if exists profiles_full_name_length_check;
alter table public.profiles add constraint profiles_full_name_length_check
  check (full_name is null or length(full_name) <= 500);
alter table public.profiles drop constraint if exists profiles_first_name_length_check;
alter table public.profiles add constraint profiles_first_name_length_check
  check (first_name is null or length(first_name) <= 200);
alter table public.profiles drop constraint if exists profiles_last_name_length_check;
alter table public.profiles add constraint profiles_last_name_length_check
  check (last_name is null or length(last_name) <= 200);
alter table public.profiles drop constraint if exists profiles_entry_year_length_check;
alter table public.profiles add constraint profiles_entry_year_length_check
  check (entry_year is null or length(entry_year) <= 20);

-- Analytics events
alter table public.analytics_events drop constraint if exists analytics_events_session_id_length_check;
alter table public.analytics_events add constraint analytics_events_session_id_length_check
  check (length(session_id) <= 64);
alter table public.analytics_events drop constraint if exists analytics_events_event_name_length_check;
alter table public.analytics_events add constraint analytics_events_event_name_length_check
  check (length(event_name) <= 128);
alter table public.analytics_events drop constraint if exists analytics_events_pathname_length_check;
alter table public.analytics_events add constraint analytics_events_pathname_length_check
  check (pathname is null or length(pathname) <= 2048);
alter table public.analytics_events drop constraint if exists analytics_events_referrer_length_check;
alter table public.analytics_events add constraint analytics_events_referrer_length_check
  check (referrer is null or length(referrer) <= 2048);
alter table public.analytics_events drop constraint if exists analytics_events_event_properties_check;
alter table public.analytics_events add constraint analytics_events_event_properties_check
  check (jsonb_typeof(event_properties) = 'object' and length(event_properties::text) <= 10000);
