-- Drop auth trigger that created profiles on signup. It caused "Database error saving new user"
-- because RLS blocks the insert when there is no session yet. Profiles are now created in the app
-- on first sign-in (useAuth + upsertProfile).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
