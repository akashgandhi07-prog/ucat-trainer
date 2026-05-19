-- Extend cross-session question history to the Inference Trainer.
--
-- Inference passages live purely in client-side TypeScript (PASSAGES array,
-- pass_01 … pass_105). To give the DB an authoritative list we seed a small
-- lookup table here — just IDs, no content.
--
-- The passage IDs are text strings ('pass_01' … 'pass_105'), so we use
-- md5(passage_id)::uuid as the question_id in user_question_history,
-- matching the same pattern used for SJT text IDs.
--
-- Trainer type: 'inference'
--
-- RPC: get_inference_passage(p_current_id text DEFAULT NULL)
--   • Authenticated users: picks unseen passage (cross-session dedup).
--   • Anon users:          picks any passage that is not p_current_id.
--   Returns the passage_id as plain text, or NULL if none available.

-- ── Passage lookup table ─────────────────────────────────────────────────────

create table if not exists public.inference_passages (
  passage_id text primary key,
  is_active  boolean not null default true
);

comment on table public.inference_passages is
  'Authoritative list of Inference Trainer passage IDs (pass_01…pass_105). '
  'Content lives in the front-end TypeScript bundle.';

alter table public.inference_passages enable row level security;
-- No direct SELECT for clients; access is exclusively via the security-definer RPC.

-- Seed all 105 passage IDs (idempotent)
insert into public.inference_passages (passage_id)
select 'pass_' || lpad(n::text, 2, '0')
from generate_series(1, 105) as gs(n)
on conflict (passage_id) do nothing;

-- ── RPC ──────────────────────────────────────────────────────────────────────

create or replace function public.get_inference_passage(
  p_current_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid     := auth.uid();
  v_trainer    text     := 'inference';
  v_cycle      smallint;
  v_unseen_cnt integer;
  v_passage_id text;
begin

  -- ── Authenticated path: DB-backed cross-session history ───────────────────
  if v_uid is not null then

    -- Ensure state row exists
    insert into public.user_trainer_state (user_id, trainer_type)
    values (v_uid, v_trainer)
    on conflict (user_id, trainer_type) do
      update set last_activity_at = now();

    select current_cycle into v_cycle
    from public.user_trainer_state
    where user_id = v_uid and trainer_type = v_trainer;

    -- Count unseen active passages in the current cycle
    select count(*) into v_unseen_cnt
    from public.inference_passages p
    where p.is_active = true
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(p.passage_id)::uuid
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

    -- Pick one unseen passage at random (avoid current if possible)
    select p.passage_id into v_passage_id
    from public.inference_passages p
    where p.is_active = true
      and not exists (
        select 1 from public.user_question_history h
        where h.user_id      = v_uid
          and h.question_id  = md5(p.passage_id)::uuid
          and h.trainer_type = v_trainer
          and h.cycle        = v_cycle
      )
      -- Prefer not repeating the passage the user just saw
      and (p_current_id is null or p.passage_id <> p_current_id)
    order by random()
    limit 1;

    -- If only one passage was unseen and it was the current one, allow it
    if v_passage_id is null then
      select p.passage_id into v_passage_id
      from public.inference_passages p
      where p.is_active = true
        and not exists (
          select 1 from public.user_question_history h
          where h.user_id      = v_uid
            and h.question_id  = md5(p.passage_id)::uuid
            and h.trainer_type = v_trainer
            and h.cycle        = v_cycle
        )
      order by random()
      limit 1;
    end if;

    if v_passage_id is null then
      return null;
    end if;

    -- Mark as seen
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(v_passage_id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;

    update public.user_trainer_state
    set last_activity_at = now()
    where user_id = v_uid and trainer_type = v_trainer;

    return v_passage_id;
  end if;

  -- ── Anon path: avoid current passage only ─────────────────────────────────
  select p.passage_id into v_passage_id
  from public.inference_passages p
  where p.is_active = true
    and (p_current_id is null or p.passage_id <> p_current_id)
  order by random()
  limit 1;

  -- Fallback: if only one passage exists and it is the current one
  if v_passage_id is null then
    select p.passage_id into v_passage_id
    from public.inference_passages p
    where p.is_active = true
    order by random()
    limit 1;
  end if;

  return v_passage_id;
end;
$$;

comment on function public.get_inference_passage(text) is
  'Returns the next inference passage ID. '
  'Authenticated users get cross-session dedup; anon users avoid only the current passage.';

grant execute on function public.get_inference_passage(text) to anon, authenticated;
