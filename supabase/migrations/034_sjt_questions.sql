-- SJT question bank: server-side only (no direct SELECT for anon/authenticated).
-- Clients fetch one scenario at a time via get_random_sjt_question.

create table if not exists public.sjt_questions (
  id text primary key,
  type text not null check (type in ('appropriateness', 'importance', 'ranking')),
  domain text not null,
  difficulty text not null check (difficulty in ('foundation', 'standard', 'challenging')),
  stem text not null,
  pivot_insight text,
  gmp_ref jsonb,
  items jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.sjt_questions is 'UCAT SJT trainer scenarios; read only via get_random_sjt_question RPC.';

create index if not exists sjt_questions_type_idx on public.sjt_questions (type);

alter table public.sjt_questions enable row level security;

-- No SELECT/INSERT/UPDATE policies for anon or authenticated (service role seeds only).

create or replace function public.get_random_sjt_question(
  p_type text,
  p_exclude_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_rec public.sjt_questions%rowtype;
begin
  if p_type is null or p_type not in ('appropriateness', 'importance', 'ranking') then
    raise exception 'Invalid question type';
  end if;

  select * into row_rec
  from public.sjt_questions q
  where q.type = p_type
    and not (q.id = any (coalesce(p_exclude_ids, '{}')))
  order by random()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', row_rec.id,
    'type', row_rec.type,
    'domain', row_rec.domain,
    'difficulty', row_rec.difficulty,
    'stem', row_rec.stem,
    'pivotInsight', row_rec.pivot_insight,
    'gmpRef', row_rec.gmp_ref,
    'items', row_rec.items
  );
end;
$$;

comment on function public.get_random_sjt_question(text, text[]) is
  'Returns one random SJT scenario as JSON (camelCase). Callable by anon for free trainers.';

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;
