-- Fix get_sjt_practice_question for the production schema.
--
-- 20260922120000 recorded served questions in user_trainer_state / user_question_history,
-- which exist in the repo's migration history but not in production (checked 2026-09-26:
-- to_regclass returned null for both). Every call therefore failed with 42P01, and the
-- client quietly fell back to unfiltered random practice, so topic and difficulty
-- filters, delayed reviews and resume-on-reload never worked on the live site.
--
-- Production's get_random_sjt_question keeps no server-side history either: the client
-- passes the ids it has already served in p_exclude_ids. This version does the same.
-- Signature, grants and the returned shape are unchanged. Idempotent.
create or replace function public.get_sjt_practice_question(
  p_type text, p_domain text default null, p_difficulty text default null,
  p_question_id text default null, p_exclude_ids text[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q public.trainer_questions%rowtype;
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

  select t.* into q from public.trainer_questions t
  where t.status = 'active' and t.trainer_type = 'sjt-' || p_type
    and (p_domain is null or t.content->>'domain' = p_domain)
    and (p_difficulty is null or t.difficulty = p_difficulty)
    and (p_question_id is null or t.legacy_id = p_question_id)
    and not (t.legacy_id = any(coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;
  if not found then return null; end if;

  return jsonb_build_object('id',q.legacy_id,'type',p_type,'domain',q.content->>'domain',
    'difficulty',q.difficulty,'stem',q.stem,'pivotInsight',q.content->>'pivotInsight',
    'gmpRef',q.content->'gmpRef','items',q.content->'items','media',q.media);
end;
$$;
revoke all on function public.get_sjt_practice_question(text,text,text,text,text[]) from public;
grant execute on function public.get_sjt_practice_question(text,text,text,text,text[]) to anon, authenticated;
comment on function public.get_sjt_practice_question(text,text,text,text,text[]) is
  'One active SJT scenario for filtered practice or delayed review. No draft access. Keeps no server-side history: callers deduplicate via p_exclude_ids, like get_random_sjt_question.';
