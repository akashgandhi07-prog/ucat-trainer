-- Idempotent: safe to re-run (if not exists / drop policy if exists).
create table if not exists public.sjt_review_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (length(question_id) between 1 and 200),
  question_type text not null check (question_type in ('appropriateness','importance','ranking')),
  domain text not null check (domain in ('knowledge_skills_development','patients_partnership_communication','colleagues_culture_safety','trust_professionalism')),
  due_at timestamptz,
  successes smallint not null default 0 check (successes between 0 and 1),
  cleared_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id, question_type),
  check ((cleared_at is null and due_at is not null) or (cleared_at is not null and due_at is null))
);

alter table public.sjt_review_items enable row level security;
drop policy if exists "Users can view own SJT reviews" on public.sjt_review_items;
create policy "Users can view own SJT reviews" on public.sjt_review_items for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own SJT reviews" on public.sjt_review_items;
create policy "Users can insert own SJT reviews" on public.sjt_review_items for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own SJT reviews" on public.sjt_review_items;
create policy "Users can update own SJT reviews" on public.sjt_review_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own SJT reviews" on public.sjt_review_items;
create policy "Users can delete own SJT reviews" on public.sjt_review_items for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.sjt_review_items from anon;
grant select, insert, update, delete on public.sjt_review_items to authenticated;
grant select, insert, update, delete on public.sjt_review_items to service_role;
create index if not exists sjt_review_items_user_due_idx on public.sjt_review_items(user_id, due_at) where cleared_at is null;
create index if not exists sjt_review_items_user_updated_idx on public.sjt_review_items(user_id, updated_at desc);

comment on table public.sjt_review_items is 'Account-synchronised SJT delayed reviews. Question text and answers are never stored.';
