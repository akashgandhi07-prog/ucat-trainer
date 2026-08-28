-- ROLLBACK ONLY. Do not run unless the 2026-08-28 duplicate-plan cleanup needs undoing.
--
-- On 2026-08-28 the 20 plan rows below were set to status='archived' because they
-- were duplicate active plans holding no student work at all (zero session
-- completions, zero mock scores). One mock row that had been logged against a
-- shadow plan was re-pointed at the plan its student actually uses. Nothing was
-- deleted. Running this restores the exact previous state.
--
-- Note: 0002_one_active_plan_per_student.sql must be dropped first, or these
-- updates will violate it.
--
--   drop index if exists public.plans_one_active_per_student;

begin;

-- Restore the archived plans to active.
update public.plans set status = 'active' where id in ('626485a8-f33e-47b4-be61-24aa2611b1fe', 'c044e512-4f8a-49b6-96a1-d05c2e6729e1', '3c9e8e0b-0ce6-479b-a7cb-7d36a764946d', 'c7a0ebc3-d0c0-4380-9729-e7979559d313', '80b75a3a-6f5a-4bc0-a550-02f0287d51f3', '8976663a-04ea-4e69-a92b-99b13db20a64', '77d80206-fed0-44c4-82e8-9f890d3f8db9', '75b44d46-cedd-4f39-b031-306665aad38a', '893f52f0-a5ce-4966-a420-6f49c6c3eb65', '730ed21f-a911-43a7-9c92-d0f140ff87d0', 'b7d99246-4715-45e8-8514-e2e9ee3a12f3', '31fb2aec-bfb1-4e90-b8c1-8017b9696430', '12128692-0c05-4e8e-9aad-7789e2178e05', 'ac9d28d3-4d5a-4319-aeb1-1903648d6d5f', '934de3d0-2831-4323-a2b7-3d46c583b6a0', 'db03b480-7278-4e51-88cb-9b599d969f56', '433b91de-8d67-4728-a99f-770f00d3868d', '2e16fbd1-191c-4d3f-bf0b-48cc72e12523', '535f0eeb-a565-4d38-8010-5b1aa62ff72d', 'be719837-6aa7-403e-96c8-806b94617d8b');

-- Restore mock rows to the plan they were originally attached to.
update public.mock_scores set plan_id = 'ac9d28d3-4d5a-4319-aeb1-1903648d6d5f' where id = '0a844ec3-2ad0-445b-9f22-7def457e3f88';

commit;
