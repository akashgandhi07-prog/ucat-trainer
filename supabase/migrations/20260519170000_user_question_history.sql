-- =============================================================================
-- User question-history system
-- =============================================================================
-- user_question_history  – append-only log of every question/block served.
-- user_trainer_state     – mutable per-user per-trainer state (cycle, stats).
--
-- Design notes
-- ─────────────────────────────────────────────────────────────────────────────
-- • auth.uid() is used inside every RPC so no user-id is ever passed from the
--   client, eliminating any risk of one user poisoning another's history.
-- • All writes go through security-definer RPCs; clients may only SELECT their
--   own rows directly (read policies below).
-- • "Reset" never deletes rows — it increments the cycle counter, so all-time
--   stats are always preserved.
-- • Auto-reset fires transparently when the unseen pool hits 0; the student
--   simply receives a fresh batch with no extra round-trip.
-- • trainer_type values used here:
--     'syllogism_foundation' | 'syllogism_micro' | 'syllogism_macro'
--   Future trainers (dm_venn, inference, sjt …) follow the same pattern.
-- =============================================================================


-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.user_question_history (
  id           uuid        not null default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  -- For syllogism_macro this stores the macro_block_id (the unit served).
  -- For all other trainers it stores the individual question id.
  question_id  uuid        not null,
  trainer_type text        not null,
  cycle        smallint    not null default 1 check (cycle >= 1),
  seen_at      timestamptz not null default now(),
  constraint uqh_pkey   primary key (id),
  constraint uqh_unique unique (user_id, question_id, trainer_type, cycle)
);

-- Covers the "count unseen in this cycle" query inside each RPC.
create index if not exists uqh_user_trainer_cycle_idx
  on public.user_question_history (user_id, trainer_type, cycle);

-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_trainer_state (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  trainer_type     text        not null,
  current_cycle    smallint    not null default 1 check (current_cycle >= 1),
  -- How many full-pool cycles the user has completed (including manual resets).
  cycles_completed smallint    not null default 0 check (cycles_completed >= 0),
  last_activity_at timestamptz not null default now(),
  constraint uts_pkey primary key (user_id, trainer_type)
);


-- ─── Row-level security ───────────────────────────────────────────────────────
-- Users may read their own rows (useful for dashboard queries).
-- All writes are handled exclusively by the security-definer RPCs below.

alter table public.user_question_history enable row level security;
alter table public.user_trainer_state     enable row level security;

drop policy if exists "uqh_read_own" on public.user_question_history;
create policy "uqh_read_own"
  on public.user_question_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "uts_read_own" on public.user_trainer_state;
create policy "uts_read_own"
  on public.user_trainer_state
  for select
  using (auth.uid() = user_id);


-- =============================================================================
-- RPC: get_syllogism_foundation_batch
-- =============================================================================
create or replace function public.get_syllogism_foundation_batch(
  p_count integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n         integer;
  v_uid     uuid     := auth.uid();   -- null for anon / unauthenticated
  v_cycle   smallint := 1;
  v_unseen  integer;
  v_ids     uuid[];
  result    jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 12), 50));

  -- ── Seen-question tracking (authenticated users only) ─────────────────────
  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_foundation')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_foundation';

    -- How many foundation questions has this user NOT yet seen this cycle?
    select count(*) into v_unseen
    from syllogism_questions sq
    where sq.question_mode = 'foundation'
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.id
          and h.trainer_type = 'syllogism_foundation'
          and h.cycle        = v_cycle
      );

    -- Auto-reset: pool exhausted → start a fresh cycle silently.
    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_foundation';
    end if;

  end if;

  -- ── Select questions ──────────────────────────────────────────────────────
  select array_agg(sq.id) into v_ids
  from (
    select sq.id
    from syllogism_questions sq
    where sq.question_mode = 'foundation'
      and (
        v_uid is null
        or not exists (
          select 1 from user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = sq.id
            and h.trainer_type = 'syllogism_foundation'
            and h.cycle        = v_cycle
        )
      )
    order by random()
    limit n
  ) sq;

  -- ── Mark as seen ──────────────────────────────────────────────────────────
  if v_uid is not null and v_ids is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    select v_uid, unnest(v_ids), 'syllogism_foundation', v_cycle
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_foundation';
  end if;

  -- ── Build response ────────────────────────────────────────────────────────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.id = any(v_ids);

  return result;
end;
$$;


-- =============================================================================
-- RPC: get_syllogism_micro_batch
-- =============================================================================
create or replace function public.get_syllogism_micro_batch(
  p_count integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n        integer;
  v_uid    uuid     := auth.uid();
  v_cycle  smallint := 1;
  v_unseen integer;
  v_ids    uuid[];
  result   jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_micro')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_micro';

    select count(*) into v_unseen
    from syllogism_questions sq
    where sq.question_mode = 'micro'
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.id
          and h.trainer_type = 'syllogism_micro'
          and h.cycle        = v_cycle
      );

    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_micro';
    end if;

  end if;

  select array_agg(sq.id) into v_ids
  from (
    select sq.id
    from syllogism_questions sq
    where sq.question_mode = 'micro'
      and (
        v_uid is null
        or not exists (
          select 1 from user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = sq.id
            and h.trainer_type = 'syllogism_micro'
            and h.cycle        = v_cycle
        )
      )
    order by random()
    limit n
  ) sq;

  if v_uid is not null and v_ids is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    select v_uid, unnest(v_ids), 'syllogism_micro', v_cycle
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_micro';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.id = any(v_ids);

  return result;
end;
$$;


-- =============================================================================
-- RPC: get_syllogism_macro_block
-- Tracks by macro_block_id (the unit served) not individual question ids.
-- Keeps p_exclude_block_ids for in-session dedup (anon + belt-and-braces).
-- =============================================================================
create or replace function public.get_syllogism_macro_block(
  p_exclude_block_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid     := auth.uid();
  v_cycle       smallint := 1;
  v_unseen      integer;
  chosen_block  uuid;
  result        jsonb;
begin

  if v_uid is not null then

    insert into user_trainer_state (user_id, trainer_type)
    values (v_uid, 'syllogism_macro')
    on conflict (user_id, trainer_type) do nothing;

    select current_cycle into v_cycle
    from user_trainer_state
    where user_id = v_uid and trainer_type = 'syllogism_macro';

    -- Count unseen blocks (not questions) for this user this cycle.
    select count(distinct sq.macro_block_id) into v_unseen
    from syllogism_questions sq
    where sq.question_mode  = 'macro'
      and sq.macro_block_id is not null
      and not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.macro_block_id
          and h.trainer_type = 'syllogism_macro'
          and h.cycle        = v_cycle
      );

    if v_unseen = 0 then
      v_cycle := v_cycle + 1;
      update user_trainer_state
         set current_cycle    = v_cycle,
             cycles_completed = cycles_completed + 1,
             last_activity_at = now()
       where user_id = v_uid and trainer_type = 'syllogism_macro';
    end if;

  end if;

  -- ── Pick a block: exclude in-session list AND db-history for this cycle ───
  select sq.macro_block_id into chosen_block
  from syllogism_questions sq
  where sq.question_mode  = 'macro'
    and sq.macro_block_id is not null
    and not (sq.macro_block_id = any(coalesce(p_exclude_block_ids, '{}')))
    and (
      v_uid is null
      or not exists (
        select 1 from user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = sq.macro_block_id
          and h.trainer_type = 'syllogism_macro'
          and h.cycle        = v_cycle
      )
    )
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  -- ── Mark block as seen ────────────────────────────────────────────────────
  if v_uid is not null then
    insert into user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, chosen_block, 'syllogism_macro', v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update user_trainer_state
       set last_activity_at = now()
     where user_id = v_uid and trainer_type = 'syllogism_macro';
  end if;

  -- ── Return questions for the block in stable order ────────────────────────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',              q.id,
        'macro_block_id',  q.macro_block_id,
        'stimulus_text',   q.stimulus_text,
        'media',           coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct',      q.is_correct,
        'logic_group',     q.logic_group,
        'trick_type',      q.trick_type,
        'explanation',     q.explanation,
        'rule_name',       q.rule_name,
        'key_takeaway',    q.key_takeaway
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from syllogism_questions q
  where q.question_mode  = 'macro'
    and q.macro_block_id = chosen_block;

  return result;
end;
$$;


-- =============================================================================
-- RPC: reset_trainer_history
-- Increments the cycle for the calling user + trainer. Never deletes data.
-- Only callable by authenticated users (auth.uid() is enforced inside).
-- =============================================================================
create or replace function public.reset_trainer_history(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_cycle          smallint;
  v_cycles_done    smallint;
begin
  if v_uid is null then
    raise exception 'reset_trainer_history: not authenticated';
  end if;

  -- Ensure state row exists before updating.
  insert into user_trainer_state (user_id, trainer_type)
  values (v_uid, p_trainer_type)
  on conflict (user_id, trainer_type) do nothing;

  update user_trainer_state
     set current_cycle    = current_cycle + 1,
         cycles_completed = cycles_completed + 1,
         last_activity_at = now()
   where user_id      = v_uid
     and trainer_type = p_trainer_type
  returning current_cycle, cycles_completed
  into v_cycle, v_cycles_done;

  return jsonb_build_object(
    'ok',               true,
    'trainer_type',     p_trainer_type,
    'current_cycle',    v_cycle,
    'cycles_completed', v_cycles_done
  );
end;
$$;


-- =============================================================================
-- RPC: get_trainer_state
-- Returns history stats for the calling user + trainer.
-- Safe to call at any time; returns {authenticated: false} for anon.
-- =============================================================================
create or replace function public.get_trainer_state(p_trainer_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_state    user_trainer_state%rowtype;
  v_seen_now integer;
  v_seen_all integer;
begin
  if v_uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select * into v_state
  from user_trainer_state
  where user_id = v_uid and trainer_type = p_trainer_type;

  if not found then
    return jsonb_build_object(
      'authenticated',    true,
      'current_cycle',    1,
      'cycles_completed', 0,
      'seen_this_cycle',  0,
      'total_seen',       0,
      'last_activity_at', null::timestamptz
    );
  end if;

  -- Questions seen in the current cycle.
  select count(*) into v_seen_now
  from user_question_history
  where user_id      = v_uid
    and trainer_type = p_trainer_type
    and cycle        = v_state.current_cycle;

  -- Distinct questions ever seen across all cycles (all-time unique).
  select count(distinct question_id) into v_seen_all
  from user_question_history
  where user_id      = v_uid
    and trainer_type = p_trainer_type;

  return jsonb_build_object(
    'authenticated',    true,
    'current_cycle',    v_state.current_cycle,
    'cycles_completed', v_state.cycles_completed,
    'seen_this_cycle',  v_seen_now,
    'total_seen',       v_seen_all,
    'last_activity_at', v_state.last_activity_at
  );
end;
$$;


-- ─── Grants ───────────────────────────────────────────────────────────────────
-- Fetch RPCs: anon + authenticated (same as before — signatures unchanged).
grant execute on function public.get_syllogism_foundation_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer)      to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[])       to anon, authenticated;

-- Management RPCs: authenticated users only.
grant execute on function public.reset_trainer_history(text) to authenticated;
grant execute on function public.get_trainer_state(text)     to authenticated;
