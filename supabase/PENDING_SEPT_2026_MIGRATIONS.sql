-- Pending September 2026 migrations for the UCAT trainer + planner.
-- Paste this whole file into the Supabase SQL editor for project qhhmcsdteqcuhvdqhkfo
-- (https://supabase.com/dashboard/project/qhhmcsdteqcuhvdqhkfo/sql/new) and run it once.
-- Every section is idempotent, so running it again is safe.
-- Generated from supabase/migrations on 2026-09-25, in this order:
--   20260922120000_sjt_targeted_practice.sql
--   20260924120000_sjt_review_sync.sql
--   20260924121000_admin_sjt_quality_signals.sql
--   20260925120000_skill_trainer_attempts.sql
--   20260925143000_exam_attempts.sql
--   20260925160000_skill_trainer_session_types.sql

begin;

-- ========== 20260922120000_sjt_targeted_practice.sql ==========
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

-- ========== 20260924120000_sjt_review_sync.sql ==========
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

-- ========== 20260924121000_admin_sjt_quality_signals.sql ==========
-- Idempotent: create or replace; grants re-issued.
create or replace function public.get_admin_sjt_quality_signals(since_ts timestamptz default now() - interval '30 days')
returns table(question_id text, question_type text, answer_changes bigint, explanation_opens bigint, abandons bigint, reports bigint, signal_total bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin access required';
  end if;
  return query
  with events as (
    select ae.event_properties->>'question_id' as qid,
      max(ae.event_properties->>'question_type') as qtype,
      count(*) filter (where ae.event_name = 'sjt_answer_changed') as changes,
      count(*) filter (where ae.event_name = 'sjt_explanation_opened') as explanations,
      count(*) filter (where ae.event_name = 'sjt_scenario_abandoned') as abandoned
    from public.analytics_events ae
    where ae.created_at >= since_ts
      and ae.event_name in ('sjt_answer_changed','sjt_explanation_opened','sjt_scenario_abandoned')
      and ae.event_properties->>'question_id' is not null
    group by ae.event_properties->>'question_id'
  ), reports_by_question as (
    -- Reports are stored as 'sjt:<question id>' or 'sjt:<question id>:<item id>';
    -- events use the bare question id. Normalise so both join on the question.
    select case
        when qf.question_identifier like 'sjt:%' then split_part(qf.question_identifier, ':', 2)
        else qf.question_identifier
      end as qid,
      max(nullif(replace(qf.trainer_type, 'sjt_', ''), qf.trainer_type)) as qtype,
      count(*) as report_count
    from public.question_feedback qf
    where qf.created_at >= since_ts and qf.trainer_type like 'sjt%'
      and qf.question_identifier is not null
    group by 1
  )
  select coalesce(e.qid, r.qid), coalesce(e.qtype, r.qtype, 'unknown'),
    coalesce(e.changes,0), coalesce(e.explanations,0), coalesce(e.abandoned,0), coalesce(r.report_count,0),
    coalesce(e.changes,0) + coalesce(e.abandoned,0) * 2 + coalesce(r.report_count,0) * 3
  from events e full join reports_by_question r on r.qid = e.qid
  order by 7 desc, 1
  limit 100;
end;
$$;
revoke all on function public.get_admin_sjt_quality_signals(timestamptz) from public;
grant execute on function public.get_admin_sjt_quality_signals(timestamptz) to authenticated;
comment on function public.get_admin_sjt_quality_signals(timestamptz) is 'Admin-only SJT quality triage using behavioural signals and direct reports.';

-- ========== 20260925120000_skill_trainer_attempts.sql ==========
create table if not exists public.skill_trainer_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  client_attempt_id uuid not null, client_session_id uuid not null,
  trainer_type text not null check (trainer_type in ('qr_setup','qr_extraction','qr_estimation','dm_constraints')),
  question_id text not null, score smallint not null check (score >= 0),
  max_score smallint not null check (max_score > 0 and score <= max_score),
  time_seconds integer not null default 0 check (time_seconds >= 0),
  components jsonb not null default '{}'::jsonb check (jsonb_typeof(components)='object'),
  difficulty text, skill_tags text[] not null default '{}',
  mistake_cause text check (mistake_cause is null or mistake_cause in ('misread','method','calculation','unit','rushed','guessed','changed_answer')),
  created_at timestamptz not null default now(),
  unique(user_id,client_attempt_id)
);
create index if not exists skill_attempts_user_type_created_idx on public.skill_trainer_attempts(user_id,trainer_type,created_at desc);
create index if not exists skill_attempts_user_question_idx on public.skill_trainer_attempts(user_id,trainer_type,question_id);
alter table public.skill_trainer_attempts enable row level security;
drop policy if exists "skill attempts select own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts insert own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts update own" on public.skill_trainer_attempts;
drop policy if exists "skill attempts delete own" on public.skill_trainer_attempts;
create policy "skill attempts select own" on public.skill_trainer_attempts for select using ((select auth.uid())=user_id);
create policy "skill attempts insert own" on public.skill_trainer_attempts for insert with check ((select auth.uid())=user_id);
create policy "skill attempts update own" on public.skill_trainer_attempts for update using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "skill attempts delete own" on public.skill_trainer_attempts for delete using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.skill_trainer_attempts to authenticated;
grant select,insert,update,delete on public.skill_trainer_attempts to service_role;
revoke all on public.skill_trainer_attempts from anon;

-- ========== 20260925143000_exam_attempts.sql ==========
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_attempt_id uuid not null,
  bank_title text not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  current_section text,
  current_question integer not null default 0 check (current_question >= 0),
  timed boolean not null default true,
  time_multiplier numeric(4,2) not null default 1 check (time_multiplier > 0),
  started_at timestamptz not null,
  completed_at timestamptz,
  answered_count integer not null default 0 check (answered_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  scorable_count integer not null default 0 check (scorable_count >= 0),
  section_results jsonb not null default '{}'::jsonb check (jsonb_typeof(section_results) = 'object'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_attempt_id)
);

create index if not exists exam_attempts_user_updated_idx
  on public.exam_attempts (user_id, updated_at desc);
create index if not exists exam_attempts_user_status_idx
  on public.exam_attempts (user_id, status, updated_at desc);

alter table public.exam_attempts enable row level security;
drop policy if exists "exam attempts select own" on public.exam_attempts;
drop policy if exists "exam attempts insert own" on public.exam_attempts;
drop policy if exists "exam attempts update own" on public.exam_attempts;
drop policy if exists "exam attempts delete own" on public.exam_attempts;
create policy "exam attempts select own" on public.exam_attempts for select using ((select auth.uid()) = user_id);
create policy "exam attempts insert own" on public.exam_attempts for insert with check ((select auth.uid()) = user_id);
create policy "exam attempts update own" on public.exam_attempts for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "exam attempts delete own" on public.exam_attempts for delete using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.exam_attempts to authenticated;
grant all on public.exam_attempts to service_role;
revoke all on public.exam_attempts from anon;

comment on table public.exam_attempts is 'Resumable full UCAT simulator attempts and per-section progress for signed-in users.';

-- ========== 20260925160000_skill_trainer_session_types.sql ==========
-- Register the four SkillTrainerShell trainers in `sessions`.
--
-- QR Setup, QR Data Extraction, QR Estimation and the DM Constraint Builder now log a
-- run-level row to public.sessions (src/hooks/useSkillTrainerRunLog.ts via
-- src/lib/trainerSessionLog.ts), alongside their per-item rows in
-- skill_trainer_attempts. That puts them on the Dashboard, the sidebar streak, the
-- weekly summary email and admin totals, like every established trainer.
--
-- sessions_training_type_check must allow the new values or every signed-in save
-- fails (see 20260612120000_allow_unit_conversions_sessions.sql). Until this runs the
-- client keeps the rejected runs on the device and uploads them afterwards.
--
-- Allowed list = the latest definition (20260612140000_vr_passage_sets_and_not_except.sql:
-- 8 values) plus the 4 new ones. Idempotent: safe to run more than once.
--
-- Consumers checked: weekly_summary_data (20260617120000) sums correct/total
-- and time_seconds over ALL sessions rows without filtering training_type, so it needs
-- no change. Admin RPCs count total_sessions over all rows; their per-type columns only
-- cover the six original trainers (unit_conversions and not_except are not broken out
-- either), so they are left unchanged here. No table is created, so no grants change.

alter table public.sessions
  drop constraint if exists sessions_training_type_check;

alter table public.sessions
  add constraint sessions_training_type_check
  check (training_type = any (array[
    'speed_reading'::text,
    'rapid_recall'::text,
    'keyword_scanning'::text,
    'calculator'::text,
    'inference_trainer'::text,
    'mental_maths'::text,
    'unit_conversions'::text,
    'not_except'::text,
    'qr_setup'::text,
    'qr_data_extraction'::text,
    'qr_estimation'::text,
    'dm_constraints'::text
  ]));


commit;

notify pgrst, 'reload schema';
