-- Performance hygiene (Supabase advisor findings, June 2026)
--
-- 1) auth_rls_initplan: wrap auth.uid() in a scalar subselect so Postgres
--    evaluates it once per statement instead of once per row.
-- 2) unindexed_foreign_keys: cover trainer_questions.replaces_question_id.
-- 3) unused_index: drop indexes with no equality-filter query pattern anywhere
--    in the app or admin RPCs. FK-cover indexes and indexes backing admin RPC
--    filters (idx_tq_section, idx_tq_difficulty, invite/pending lookups, etc.)
--    are deliberately kept even though the advisor flags them as unused - the
--    database is young and they exist for correctness/scale reasons.

-- ── 1) RLS initplan fixes ─────────────────────────────────────────────────────

alter policy "Users can log their own attempts"
  on public.trainer_question_attempts
  with check (user_id = (select auth.uid()));

alter policy "Users can read their own attempts"
  on public.trainer_question_attempts
  using (user_id = (select auth.uid()));

alter policy "Users can read their own reports"
  on public.question_reports
  using (user_id = (select auth.uid()));

alter policy "Users can submit reports"
  on public.question_reports
  with check (user_id = (select auth.uid()));

-- ── 2) Missing FK cover index ─────────────────────────────────────────────────

create index if not exists trainer_questions_replaces_question_id_idx
  on public.trainer_questions (replaces_question_id);

-- ── 3) Redundant unused indexes ───────────────────────────────────────────────
-- skill_tag is only ever searched with ilike '%…%' (btree cannot help), and no
-- query filters attempts by trainer_type/created_at or reviews by status alone.

drop index if exists public.idx_tq_skill_tag;
drop index if exists public.idx_tqa_skill_tag;
drop index if exists public.idx_tqa_trainer_type;
drop index if exists public.idx_tqa_created_at;
drop index if exists public.idx_qrev_status;
