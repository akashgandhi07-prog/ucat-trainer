-- Switch get_random_sjt_question to read from trainer_questions.
--
-- The old sjt_questions table is NOT dropped — it stays for rollback.
-- To roll back: redeploy the previous version from 20260519180000_sjt_history.sql.
--
-- Key mapping:
--   legacy_id            → id          (text ID returned to frontend, used for history hash)
--   trainer_type         → 'sjt-' || p_type   (dash convention in trainer_questions)
--   content->>'domain'   → domain
--   content->>'pivotInsight' → pivotInsight
--   content->'gmpRef'    → gmpRef
--   content->'items'     → items
--   status = 'active'    replaces no filter (old table had no status)
--
-- History tables (user_question_history, user_trainer_state) keep
--   trainer_type = 'sjt_' || p_type  (underscore) for backward compatibility.
-- History question_id stays md5(legacy_id)::uuid — identical to old md5(q.id)::uuid
-- because legacy_id equals the original sjt_questions.id.

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
  v_trainer     text    := 'sjt_' || p_type;   -- underscore: history table convention
  v_tq_type     text    := 'sjt-' || p_type;   -- dash: trainer_questions convention
  v_cycle       smallint;
  v_unseen_cnt  integer;

  -- explicit fields instead of %rowtype (table changed)
  v_id          text;
  v_difficulty  text;
  v_stem        text;
  v_content     jsonb;
begin
  -- ── Validate input ─────────────────────────────────────────────────────────
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type: %', p_type;
  end if;

  -- ── Authenticated path: DB-backed cross-session history ────────────────────
  if v_uid is not null then

    -- Ensure state row exists
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count unseen questions in current cycle
    select count(*) into v_unseen_cnt
    from public.trainer_questions q
    where q.trainer_type = v_tq_type
      and q.status = 'active'
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.legacy_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      );

    -- Auto-reset: if all seen, start a new cycle
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
    select q.legacy_id, q.difficulty, q.stem, q.content
    into   v_id, v_difficulty, v_stem, v_content
    from public.trainer_questions q
    where q.trainer_type = v_tq_type
      and q.status = 'active'
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(q.legacy_id)::uuid
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
    values (v_uid, md5(v_id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return jsonb_build_object(
      'id',           v_id,
      'type',         p_type,
      'domain',       v_content->>'domain',
      'difficulty',   v_difficulty,
      'stem',         v_stem,
      'pivotInsight', v_content->>'pivotInsight',
      'gmpRef',       v_content->'gmpRef',
      'items',        v_content->'items'
    );
  end if;

  -- ── Anon path: in-session dedup via p_exclude_ids ────────────────────────
  select q.legacy_id, q.difficulty, q.stem, q.content
  into   v_id, v_difficulty, v_stem, v_content
  from public.trainer_questions q
  where q.trainer_type = v_tq_type
    and q.status = 'active'
    and not (q.legacy_id = any(coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',           v_id,
    'type',         p_type,
    'domain',       v_content->>'domain',
    'difficulty',   v_difficulty,
    'stem',         v_stem,
    'pivotInsight', v_content->>'pivotInsight',
    'gmpRef',       v_content->'gmpRef',
    'items',        v_content->'items'
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random active SJT scenario from trainer_questions as JSONB (camelCase). '
  'Authenticated users get cross-session dedup via user_question_history; '
  'anon users get in-session dedup via p_exclude_ids. '
  'Old sjt_questions table is kept for rollback.';

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;
