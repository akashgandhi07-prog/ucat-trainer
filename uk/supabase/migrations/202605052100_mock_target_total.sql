-- Replace per-section average goal with VR+DM+QR total out of 2700.
-- Migrates existing mock_target_avg (300-900) to mock_target_total as avg × 3 when that column exists.

alter table public.plans
  add column if not exists mock_target_total smallint
    check (mock_target_total is null or mock_target_total between 900 and 2700);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'mock_target_avg'
  ) then
    update public.plans
    set mock_target_total = (mock_target_avg * 3)::smallint
    where mock_target_avg is not null
      and mock_target_total is null;

    alter table public.plans drop column mock_target_avg;
  end if;
end $$;

comment on column public.plans.mock_target_total is 'Student goal: VR+DM+QR combined total out of 2700';
