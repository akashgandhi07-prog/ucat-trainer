-- UCATSEN: extra time in the real exam; full mocks scheduled as 2h30 in the planner.

alter table public.plans
  add column if not exists ucat_sen boolean not null default false;

comment on column public.plans.ucat_sen is 'When true, scheduled full mocks use 2h30 (UCATSEN); standard is 2h';
