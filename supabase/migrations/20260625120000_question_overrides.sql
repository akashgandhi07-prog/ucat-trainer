-- Admin-managed overrides for flagged questions.
--
-- Lets an admin (a) soft-hide a question so trainers stop serving it, and
-- (b) edit a question's content live without a redeploy. Keyed by the same
-- question_identifier string stored in question_feedback, normalised so that
-- SJT item-level and distortion index-level flags collapse to a stable key:
--   dm_trainer:<id> | inference:<passageId>:<qid> | syllogism:<id>
--   sjt:<questionId>            (item suffix dropped — hide/edit at question level)
--   distortion-passage:<passageId>  (distortion items are generated; hide whole passage)
--
-- The `override` JSON holds only the changed fields; its shape depends on the
-- trainer kind and is merged on top of the resolved question client-side.

create table if not exists public.question_overrides (
  question_identifier text primary key,
  question_kind text,
  trainer_type text,
  is_hidden boolean not null default false,
  override jsonb,
  note text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.question_overrides is
  'Admin overrides for flagged questions: soft-hide flag plus field-level content edits, keyed by normalised question_identifier.';

-- RLS: everyone (incl. logged-out students) may READ so trainers can filter
-- hidden questions and apply edits. Only admins may write.
alter table public.question_overrides enable row level security;

drop policy if exists "Anyone can read question overrides" on public.question_overrides;
create policy "Anyone can read question overrides"
  on public.question_overrides for select
  to authenticated, anon
  using (true);

drop policy if exists "Admins can manage question overrides" on public.question_overrides;
create policy "Admins can manage question overrides"
  on public.question_overrides for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Fix latent bug: question_feedback had no DELETE policy, so the admin
-- "Dismiss all" button failed silently under RLS. Allow admins to delete.
drop policy if exists "Admins can delete question feedback" on public.question_feedback;
create policy "Admins can delete question feedback"
  on public.question_feedback for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

notify pgrst, 'reload schema';
