-- Bug reports: users can submit; only admins can read (via RLS).
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null,
  page_url text,
  created_at timestamptz not null default now()
);

create index if not exists bug_reports_created_at on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- Authenticated users can insert their own report (user_id set to auth.uid()).
create policy "Users can insert bug reports"
  on public.bug_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can select (policy added in 004_profiles_role after role column exists).
-- For now, no SELECT so only backend/admin tools with service role can read.
comment on table public.bug_reports is 'User-submitted bug reports; admin-only read.';
