-- Targets for mocks page (overall VR/DM/QR average goal + optional SJT band goal)

alter table public.plans
  add column if not exists mock_target_avg smallint
    check (mock_target_avg is null or mock_target_avg between 300 and 900),
  add column if not exists mock_target_sjt_band smallint
    check (mock_target_sjt_band is null or mock_target_sjt_band between 1 and 4);

comment on column public.plans.mock_target_avg is 'Student goal: average VR+DM+QR (where entered)';
comment on column public.plans.mock_target_sjt_band is 'Optional SJT band goal (1=strongest convention in app)';
