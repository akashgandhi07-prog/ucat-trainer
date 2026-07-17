-- The admin flagged-question panel resolves reported syllogism and SJT
-- questions by id, but both tables are RPC-only (no SELECT policy), so the
-- panel always fell back to "could not read from the database". Grant SELECT
-- to admins only; student reads keep going through the SECURITY DEFINER RPCs.

drop policy if exists "Admins can read syllogism questions" on public.syllogism_questions;
create policy "Admins can read syllogism questions"
  on public.syllogism_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Admins can read sjt questions" on public.sjt_questions;
create policy "Admins can read sjt questions"
  on public.sjt_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

notify pgrst, 'reload schema';
