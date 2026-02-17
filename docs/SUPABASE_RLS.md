# Supabase RLS (Row Level Security)

The app uses the Supabase **anon** key in the client. Security depends entirely on **Row Level Security** so users can only access their own data.

## Required policies

### `profiles`

- **SELECT**: Allow if `auth.uid() = id` (users read their own profile).
- **INSERT**: Allow if `auth.uid() = id` (user can create their own row).
- **UPDATE**: Allow if `auth.uid() = id` (user can update their own row).

### `sessions`

- **SELECT**: Allow if `auth.uid() = user_id` (users read only their sessions).
- **INSERT**: Allow if `auth.uid() = user_id` (users insert only with their own `user_id`).
- **UPDATE/DELETE**: Restrict or disable as needed (app currently only inserts and selects).

## Setup

1. Enable RLS on both tables:
   - `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;`
2. Create policies as above (e.g. in Supabase SQL editor or migrations).
3. Never use the service role key in the client; use only the anon key.

## Environment

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Do not commit `.env.local`.
