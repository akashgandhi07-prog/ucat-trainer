-- One active plan per student.
--
-- Context: on 2026-08-28, 19 students were found with two active plan rows each,
-- created in the same second. Onboarding archives a student's active plans and
-- then inserts the new one, which is safe sequentially but not when two submits
-- run concurrently: both archive (finding nothing), then both insert. The app
-- picks a plan with `order by created_at desc limit 1`, so with identical
-- timestamps Postgres was free to return either row on any given load. Students
-- logged work against one plan, had rebuilds applied to the other, and reported
-- that their timetable would not change.
--
-- Those duplicates have been cleaned up: the plan holding the student's
-- completions and mocks stays active, the empty one was set to 'archived'
-- (nothing was deleted; see 0003_undo_duplicate_plan_archive.sql to reverse it).
-- This index stops the class recurring.
--
-- Client-side changes that ship with this (already in the app):
--   * onboarding-client.tsx guards against a double submit with a ref
--   * create-plan-from-onboarding.ts archives again after inserting, and treats
--     a lost insert race as success by returning the plan the other run created
--   * ensureActivePlanForMocks already re-fetches when its insert fails
--
-- Safe to run: verified 0 students currently have more than one active plan.
-- Should this ever fail with a uniqueness error, find the offenders first:
--
--   select student_id, count(*)
--   from public.plans
--   where status = 'active'
--   group by student_id
--   having count(*) > 1;

create unique index if not exists plans_one_active_per_student
  on public.plans (student_id)
  where status = 'active';

comment on index public.plans_one_active_per_student is
  'A student may hold at most one active plan. Added 2026-08-28 after concurrent onboarding submits produced duplicate active plans that the app alternated between.';
