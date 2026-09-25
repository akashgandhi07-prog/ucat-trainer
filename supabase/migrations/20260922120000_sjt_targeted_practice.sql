-- Deploy before the targeted-practice frontend. Existing unfiltered RPC is unchanged.
-- Idempotent: safe to re-run (create or replace + re-issued grants).
--
-- Filtered practice (topic / difficulty) for signed-in users shares the same
-- cross-session history as get_random_sjt_question: unseen questions in the
-- current cycle are preferred, and the served question is recorded in
-- user_question_history (trainer_type 'sjt_<type>', question_id md5(legacy_id)).
-- The cycle is not advanced here; once every matching question has been seen,
-- seen ones are served again in random order until the unfiltered RPC rolls the
-- cycle. Delayed reviews (p_question_id) are neither filtered by nor recorded in
-- history, because the student is deliberately retrying a known scenario.
create or replace function public.get_sjt_practice_question(
  p_type text, p_domain text default null, p_difficulty text default null,
  p_question_id text default null, p_exclude_ids text[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q public.trainer_questions%rowtype;
  v_uid uuid := auth.uid();
  v_trainer text := 'sjt_' || p_type;
  v_cycle smallint;
begin
  if p_type is null or p_type not in ('appropriateness','importance','ranking') then
    raise exception 'Invalid SJT type';
  end if;
  if p_domain is not null and p_domain not in ('knowledge_skills_development','patients_partnership_communication','colleagues_culture_safety','trust_professionalism') then
    raise exception 'Invalid domain';
  end if;
  if p_difficulty is not null and p_difficulty not in ('easy','medium','hard') then
    raise exception 'Invalid difficulty';
  end if;
  if cardinality(p_exclude_ids) > 1000
    or length(p_question_id) > 200
    or exists (select 1 from unnest(coalesce(p_exclude_ids, '{}')) id where length(id) > 200)
  then
    raise exception 'Invalid request size';
  end if;

  if v_uid is not null and p_question_id is null then
    select s.current_cycle into v_cycle
    from public.user_trainer_state s
    where s.user_id = v_uid and s.trainer_type = v_trainer;
  end if;

  select t.* into q from public.trainer_questions t
  where t.status = 'active' and t.trainer_type = 'sjt-' || p_type
    and (p_domain is null or t.content->>'domain' = p_domain)
    and (p_difficulty is null or t.difficulty = p_difficulty)
    and (p_question_id is null or t.legacy_id = p_question_id)
    and not (t.legacy_id = any(coalesce(p_exclude_ids, '{}')))
  order by
    (v_cycle is not null and exists (
      select 1 from public.user_question_history h
      where h.user_id = v_uid
        and h.question_id = md5(t.legacy_id)::uuid
        and h.trainer_type = v_trainer
        and h.cycle = v_cycle
    )),
    random()
  limit 1;
  if not found then return null; end if;

  if v_uid is not null and p_question_id is null then
    if v_cycle is null then
      insert into public.user_trainer_state (user_id, trainer_type)
      values (v_uid, v_trainer)
      on conflict (user_id, trainer_type) do update set last_activity_at = now();
      select s.current_cycle into v_cycle
      from public.user_trainer_state s
      where s.user_id = v_uid and s.trainer_type = v_trainer;
    else
      update public.user_trainer_state set last_activity_at = now()
      where user_id = v_uid and trainer_type = v_trainer;
    end if;
    insert into public.user_question_history (user_id, question_id, trainer_type, cycle)
    values (v_uid, md5(q.legacy_id)::uuid, v_trainer, v_cycle)
    on conflict (user_id, question_id, trainer_type, cycle) do nothing;
  end if;

  return jsonb_build_object('id',q.legacy_id,'type',p_type,'domain',q.content->>'domain',
    'difficulty',q.difficulty,'stem',q.stem,'pivotInsight',q.content->>'pivotInsight',
    'gmpRef',q.content->'gmpRef','items',q.content->'items','media',q.media);
end;
$$;
revoke all on function public.get_sjt_practice_question(text,text,text,text,text[]) from public;
grant execute on function public.get_sjt_practice_question(text,text,text,text,text[]) to anon, authenticated;
comment on function public.get_sjt_practice_question(text,text,text,text,text[]) is
  'One active SJT scenario for filtered practice or delayed review. No draft access. Signed-in filtered practice prefers unseen questions and records history; anon deduplicates via p_exclude_ids.';
