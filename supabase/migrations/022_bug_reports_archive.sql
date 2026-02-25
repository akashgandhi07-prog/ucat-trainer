-- Add archived state to bug_reports so admins can archive feedback
-- without deleting it, and add an update policy for admins.

alter table public.bug_reports
  add column if not exists archived_at timestamptz;

create index if not exists bug_reports_archived_at_created_at_idx
  on public.bug_reports (archived_at nulls first, created_at desc);

-- Allow admins to update bug_reports (used for archive/unarchive).
drop policy if exists "Admins can update bug reports" on public.bug_reports;
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

