-- Universal question media support.
-- Media files live in Supabase Storage bucket "question-media"; question rows store
-- portable JSON metadata and storage paths/URLs in media jsonb.

alter table public.sjt_questions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.syllogism_questions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.sjt_questions
  drop constraint if exists sjt_questions_media_is_array;

alter table public.sjt_questions
  add constraint sjt_questions_media_is_array
  check (jsonb_typeof(media) = 'array');

alter table public.syllogism_questions
  drop constraint if exists syllogism_questions_media_is_array;

alter table public.syllogism_questions
  add constraint syllogism_questions_media_is_array
  check (jsonb_typeof(media) = 'array');

comment on column public.sjt_questions.media is
  'Optional array of question media objects. Image src values may be full URLs, root-relative paths, or paths inside the question-media Storage bucket.';

comment on column public.syllogism_questions.media is
  'Optional array of question media objects for the stimulus/conclusion. Macro blocks should repeat shared stimulus media on each row in the block.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-media',
  'question-media',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Question media images are publicly readable" on storage.objects;
create policy "Question media images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'question-media');

drop policy if exists "Admins can upload question media" on storage.objects;
create policy "Admins can upload question media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can update question media" on storage.objects;
create policy "Admins can update question media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete question media" on storage.objects;
create policy "Admins can delete question media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'question-media'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

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
    'media', coalesce(row_rec.media, '[]'::jsonb),
    'pivotInsight', row_rec.pivot_insight,
    'gmpRef', row_rec.gmp_ref,
    'items', row_rec.items
  );
end;
$$;

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
        'media', coalesce(q.media, '[]'::jsonb),
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
        'media', coalesce(q.media, '[]'::jsonb),
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

grant execute on function public.get_random_sjt_question(text, text[]) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;
