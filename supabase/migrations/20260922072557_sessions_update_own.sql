-- Trainer drills save through upsertTrainerSession (src/lib/trainerSessionLog.ts), which
-- upserts on (user_id, client_session_id) so repeated snapshots of one drill converge on
-- one row. sessions has never had an UPDATE policy, so the second write of a drill hits
-- ON CONFLICT DO UPDATE and fails with "new row violates row-level security policy
-- (USING expression) for table sessions": the row keeps its first snapshot and the student
-- sees a save error. Own-row updates match docs/ACCESS_RLS_MATRIX.md ("Own rows").

drop policy if exists "Users can update own sessions" on public.sessions;
create policy "Users can update own sessions" on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
