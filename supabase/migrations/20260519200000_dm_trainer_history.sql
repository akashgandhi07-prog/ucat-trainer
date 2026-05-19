-- Extend the trainer-history system to DM Skills trainers.
--
-- DM trainers (Venn Logic, Data Logic, Argument Judge) always serve
-- the complete question set in order, so per-question dedup would add
-- no value.  Instead we track at the SET level: how many times has
-- the user completed each drill?
--
-- Trainer-type naming convention (matching the rest of the system):
--   'dm_venn_logic' | 'dm_data_logic' | 'dm_argument_judge'
--
-- The client calls complete_dm_trainer_drill once per finished (non-retry)
-- drill.  The function:
--   1. Upserts user_trainer_state so the row exists.
--   2. Increments cycles_completed and bumps the cycle counter so
--      the UX can say "you've done this X times".
--   3. Updates last_activity_at.
--
-- No user_question_history rows are written — a DM cycle = one full drill.

create or replace function public.complete_dm_trainer_drill(
  p_trainer_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;  -- anon users: nothing to record
  end if;

  if p_trainer_type not in ('dm_venn_logic', 'dm_data_logic', 'dm_argument_judge') then
    raise exception 'Invalid DM trainer type: %', p_trainer_type;
  end if;

  insert into public.user_trainer_state (user_id, trainer_type, current_cycle, cycles_completed)
  values (v_uid, p_trainer_type, 2, 1)
  on conflict (user_id, trainer_type) do update
    set current_cycle    = public.user_trainer_state.current_cycle + 1,
        cycles_completed = public.user_trainer_state.cycles_completed + 1,
        last_activity_at = now();
end;
$$;

comment on function public.complete_dm_trainer_drill(text) is
  'Records one completed DM drill run in user_trainer_state (cycles_completed). '
  'Call once per finished non-retry session. No-op for anon users.';

grant execute on function public.complete_dm_trainer_drill(text) to authenticated;
