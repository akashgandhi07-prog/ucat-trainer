-- Extend cross-session question history to SJT trainers.
--
-- The sjt_questions.id column is TEXT (not UUID), so we store
-- md5(q.id)::uuid as the question_id in user_question_history.
-- This gives a stable, deterministic UUID from any text ID.
--
-- Trainer type naming convention:
--   'sjt_appropriateness' | 'sjt_importance' | 'sjt_ranking'
--
-- For authenticated users: DB history drives dedup (cross-session).
-- For anon users:          p_exclude_ids fallback (in-session only, existing behaviour).
--
-- No client-side changes are needed — the RPC signature is unchanged.

create or replace function public.get_random_sjt_question(
  p_type        text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid    := auth.uid();
  v_trainer     text    := 'sjt_' || p_type;
  v_cycle       smallint;
  v_unseen_cnt  integer;
  v_row         public.sjt_questions%rowtype;
begin
  -- ── Validate input ─────────────────────────────────────────────────────────
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type: %', p_type;
  end if;

  -- ── Authenticated path: DB-backed cross-session history ────────────────────
  if v_uid is not null then

    -- Ensure state row exists (upsert keeps last_activity_at fresh)
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count questions not yet seen in the current cycle
    select count(*) into v_unseen_cnt
    from public.sjt_questions q
    where q.type = p_type
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      );

    -- Auto-reset: if all seen, silently start a new cycle
    if v_unseen_cnt = 0 then
      update public.user_trainer_state
      set current_cycle    = current_cycle + 1,
          cycles_completed = cycles_completed + 1,
          last_activity_at = now()
      where user_id = v_uid and trainer_type = v_trainer;

      select current_cycle into v_cycle
      from public.user_trainer_state
      where user_id = v_uid and trainer_type = v_trainer;
    end if;

    -- Pick one unseen question at random
    select q.* into v_row
    from public.sjt_questions q
    where q.type = p_type
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      )
    order by random()
    limit 1;

    if not found then
      return null;
    end if;

    -- Mark as seen
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(v_row.id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return jsonb_build_object(
      'id',           v_row.id,
      'type',         v_row.type,
      'domain',       v_row.domain,
      'difficulty',   v_row.difficulty,
      'stem',         v_row.stem,
      'pivotInsight', v_row.pivot_insight,
      'gmpRef',       v_row.gmp_ref,
      'items',        v_row.items
    );
  end if;

  -- ── Anon path: in-session dedup via p_exclude_ids (unchanged behaviour) ────
  select * into v_row
  from public.sjt_questions q
  where q.type = p_type
    and not (q.id = any(coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',           v_row.id,
    'type',         v_row.type,
    'domain',       v_row.domain,
    'difficulty',   v_row.difficulty,
    'stem',         v_row.stem,
    'pivotInsight', v_row.pivot_insight,
    'gmpRef',       v_row.gmp_ref,
    'items',        v_row.items
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random SJT scenario as JSONB (camelCase). '
  'Authenticated users get cross-session dedup via user_question_history; '
  'anon users get in-session dedup via p_exclude_ids.';

-- Grants unchanged: anon + authenticated
grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;
