-- Paste this entire file into Supabase Dashboard → SQL Editor → New query, then Run.
-- This creates bug_reports (feedback), adds role to profiles, and the admin stats function.

-- 1) Add role to profiles FIRST (policies and get_admin_stats depend on it)
alter table public.profiles
  add column if not exists role text not null default 'user';

update public.profiles set role = 'user' where role is null;

-- 2) Bug reports / feedback table
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  type text not null default 'bug' check (type in ('bug', 'suggestion')),
  description text not null,
  page_url text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists bug_reports_created_at on public.bug_reports (created_at desc);

create index if not exists bug_reports_archived_at_created_at_idx
  on public.bug_reports (archived_at nulls first, created_at desc);

alter table public.bug_reports enable row level security;

create policy "Users can insert bug reports"
  on public.bug_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can view bug reports"
  on public.bug_reports for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update bug reports"
  on public.bug_reports for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

comment on table public.bug_reports is 'User-submitted feedback (bugs and suggestions); admin-only read.';

-- 3) Admin stats function (used by Admin page)
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  result jsonb;
begin
  select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
  if is_admin is not true then
    raise exception 'Forbidden: admin only';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'total_sessions', (select count(*)::int from public.sessions),
    'sessions_speed_reading', (select count(*)::int from public.sessions where training_type = 'speed_reading'),
    'sessions_rapid_recall', (select count(*)::int from public.sessions where training_type = 'rapid_recall'),
    'sessions_keyword_scanning', (select count(*)::int from public.sessions where training_type = 'keyword_scanning'),
    'bug_reports_count', (select count(*)::int from public.bug_reports where type = 'bug'),
    'suggestions_count', (select count(*)::int from public.bug_reports where type = 'suggestion')
  ) into result;
  return result;
end;
$$;

comment on function public.get_admin_stats() is 'Returns aggregate stats for admin dashboard. Callable only when profiles.role = ''admin'' for auth.uid().';

-- 4) Make yourself admin (optional): run in a separate query after this script replace the UUID with your auth user id from Authentication → Users
-- update public.profiles set role = 'admin' where id = '4c9d46b5-be22-4db9-b992-b862xxxxxxxx';
