-- Lock syllogism_questions: revoke public table read; serve drills via RPC only.

drop policy if exists "Allow public read access to syllogism questions" on public.syllogism_questions;

create or replace function public.get_syllogism_micro_batch(p_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

comment on function public.get_syllogism_micro_batch(integer) is
  'Returns up to 50 random syllogism questions for micro drill. Callable by anon.';

create or replace function public.get_syllogism_macro_block(p_exclude_block_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_block uuid;
  result jsonb;
begin
  select sq.macro_block_id into chosen_block
  from public.syllogism_questions sq
  where sq.macro_block_id is not null
    and not (sq.macro_block_id = any (coalesce(p_exclude_block_ids, '{}')))
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from public.syllogism_questions q
  where q.macro_block_id = chosen_block;

  return result;
end;
$$;

comment on function public.get_syllogism_macro_block(uuid[]) is
  'Returns one random macro block (5 conclusions per stimulus). Callable by anon.';

grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;
