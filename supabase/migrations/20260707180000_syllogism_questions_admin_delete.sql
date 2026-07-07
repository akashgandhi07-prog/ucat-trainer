-- Allow admins to DELETE syllogism questions from the admin dashboard.
--
-- public.syllogism_questions has RLS enabled but (deliberately) no SELECT /
-- INSERT / UPDATE policies: drills are served through SECURITY DEFINER RPCs,
-- so ordinary API reads and writes are denied. That left the admin
-- "delete syllogism question" button failing silently, because there was no
-- DELETE policy either. Add an admin-only DELETE policy so the button works.
--
-- We intentionally do NOT add SELECT/INSERT/UPDATE policies: reads must keep
-- going through the RPCs.

drop policy if exists "Admins can delete syllogism questions" on public.syllogism_questions;
create policy "Admins can delete syllogism questions"
  on public.syllogism_questions for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

notify pgrst, 'reload schema';
