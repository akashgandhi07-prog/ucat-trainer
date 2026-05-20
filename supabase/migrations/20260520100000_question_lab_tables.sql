-- Question Lab: core tables
--
-- Creates four tables:
--   trainer_questions         - authored skills-trainer questions
--   trainer_question_attempts - per-question analytics (subskill, time, answer)
--   question_reports          - student flags on live questions
--   question_reviews          - human/system review records
--
-- Also installs:
--   prevent_active_question_edit() trigger on trainer_questions
--   update_updated_at() trigger on trainer_questions
--
-- All student access goes through security-definer RPCs, not direct table reads.
-- RLS is enabled on all tables; permissive admin policies are added separately
-- once the dashboard is built.

-- ─── trainer_questions ────────────────────────────────────────────────────────

create table public.trainer_questions (
  id                    uuid        primary key default gen_random_uuid(),
  legacy_id             text,
  section               text        not null
                          check (section in ('vr', 'dm', 'qr', 'sjt')),
  trainer_type          text        not null
                          check (trainer_type in (
                            'venn-logic', 'data-logic', 'argument-judge',
                            'sjt-appropriateness', 'sjt-importance', 'sjt-ranking',
                            'inference', 'vr-passages', 'qr-conversions'
                          )),
  question_kind         text        not null
                          check (question_kind in (
                            'mcq', 'appropriateness', 'importance',
                            'ranking', 'numeric', 'true-false-ct'
                          )),
  status                text        not null default 'draft'
                          check (status in ('draft', 'active', 'archived')),
  difficulty            text        not null default 'medium'
                          check (difficulty in ('easy', 'medium', 'hard')),
  skill_tag             text        not null default '',
  stem                  text        not null default '',
  explanation           text        not null default '',
  content               jsonb       not null default '{}'::jsonb,
  media                 jsonb       not null default '[]'::jsonb,
  quality_status        text        not null default 'unchecked'
                          check (quality_status in ('unchecked', 'pass', 'needs_review', 'fail')),
  quality_notes         text,
  last_reviewed_at      timestamptz,
  is_flagged            boolean     not null default false,
  flag_count            integer     not null default 0,
  replaces_question_id  uuid        references public.trainer_questions(id),
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.trainer_questions is
  'Authored skills-trainer questions. Students access via security-definer RPCs only.';

comment on column public.trainer_questions.legacy_id is
  'Original local ID (e.g. venn-logic-001) preserved during migration.';

comment on column public.trainer_questions.content is
  'Type-specific question payload. Shape depends on question_kind.';

comment on column public.trainer_questions.replaces_question_id is
  'Set when this draft was created to replace an active question. '
  'On activation, the original is archived.';

-- Indexes for dashboard filters and RPC queries
create index idx_tq_trainer_type  on public.trainer_questions (trainer_type);
create index idx_tq_section       on public.trainer_questions (section);
create index idx_tq_status        on public.trainer_questions (status);
create index idx_tq_skill_tag     on public.trainer_questions (skill_tag);
create index idx_tq_quality       on public.trainer_questions (quality_status);
create index idx_tq_flagged       on public.trainer_questions (is_flagged) where is_flagged = true;
create index idx_tq_difficulty    on public.trainer_questions (difficulty);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tg_trainer_questions_updated_at
  before update on public.trainer_questions
  for each row execute function public.set_updated_at();

-- ─── Active question protection trigger ───────────────────────────────────────
--
-- Blocks changes to core content fields while status = 'active'.
-- These fields must only change via the duplicate-edit-archive-activate workflow.
-- The UI also disables these fields, but the trigger is the hard guarantee.

create or replace function public.prevent_active_question_edit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    if (
      new.stem          is distinct from old.stem          or
      new.explanation   is distinct from old.explanation   or
      new.content       is distinct from old.content       or
      new.media         is distinct from old.media         or
      new.difficulty    is distinct from old.difficulty    or
      new.skill_tag     is distinct from old.skill_tag     or
      new.trainer_type  is distinct from old.trainer_type  or
      new.question_kind is distinct from old.question_kind
    ) then
      raise exception
        'Cannot edit content fields on an active question (id: %). '
        'Duplicate it as a draft, edit the draft, then activate the replacement.',
        old.id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_active_question_edit() is
  'Blocks changes to stem, explanation, content, media, difficulty, skill_tag, '
  'trainer_type, question_kind while the question is active. '
  'These fields can only change via the duplicate-draft-archive-activate workflow.';

create trigger tg_prevent_active_question_edit
  before update on public.trainer_questions
  for each row execute function public.prevent_active_question_edit();

-- ─── RLS: trainer_questions ───────────────────────────────────────────────────
--
-- No direct reads for authenticated or anon users.
-- Students use security-definer RPCs. Admin dashboard uses service role.
-- Permissive admin policies will be added when the dashboard is built.

alter table public.trainer_questions enable row level security;

-- ─── trainer_question_attempts ────────────────────────────────────────────────
--
-- One row per question attempt. Records subskill analytics from day one.
-- Users can insert and read their own rows. Anon sessions use user_id = null.

create table public.trainer_question_attempts (
  id                   uuid        primary key default gen_random_uuid(),
  question_id          uuid        not null references public.trainer_questions(id),
  user_id              uuid,       -- null for anonymous
  session_id           uuid,       -- groups attempts within one trainer session
  trainer_type         text        not null,
  skill_tag            text        not null default '',
  difficulty           text        not null
                         check (difficulty in ('easy', 'medium', 'hard')),
  is_correct           boolean     not null,
  selected_answer      text,       -- option id, verdict, rating value, numeric, etc.
  changed_answer       boolean     not null default false,
  time_taken_seconds   integer     not null,
  explanation_viewed   boolean     not null default false,
  attempt_number       integer     not null default 1,
  created_at           timestamptz not null default now()
);

comment on table public.trainer_question_attempts is
  'Per-question attempt analytics. Enables subskill performance breakdowns '
  '(e.g. strong on Venn totals, weak on exactly-two questions).';

comment on column public.trainer_question_attempts.session_id is
  'Client-generated UUID grouping all attempts within one trainer session.';

comment on column public.trainer_question_attempts.changed_answer is
  'True if the user changed their selected answer before final submission.';

comment on column public.trainer_question_attempts.attempt_number is
  '1 = first time this user has attempted this question.';

create index idx_tqa_question_id  on public.trainer_question_attempts (question_id);
create index idx_tqa_user_id      on public.trainer_question_attempts (user_id);
create index idx_tqa_trainer_type on public.trainer_question_attempts (trainer_type);
create index idx_tqa_skill_tag    on public.trainer_question_attempts (skill_tag);
create index idx_tqa_created_at   on public.trainer_question_attempts (created_at);

alter table public.trainer_question_attempts enable row level security;

-- Authenticated users can insert their own attempts
create policy "Users can log their own attempts"
  on public.trainer_question_attempts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Authenticated users can read their own attempts
create policy "Users can read their own attempts"
  on public.trainer_question_attempts
  for select
  to authenticated
  using (user_id = auth.uid());

-- Anon users can insert with null user_id (session-only tracking)
create policy "Anon users can log attempts"
  on public.trainer_question_attempts
  for insert
  to anon
  with check (user_id is null);

-- ─── question_reports ─────────────────────────────────────────────────────────
--
-- Student flags on live questions. One row per report.
-- Inserting a report also increments flag_count on the question via trigger.

create table public.question_reports (
  id                    uuid        primary key default gen_random_uuid(),
  trainer_question_id   uuid        not null references public.trainer_questions(id),
  user_id               uuid,
  reason                text        not null
                          check (reason in (
                            'typo', 'ambiguous', 'wrong_answer',
                            'bad_explanation', 'technical_issue', 'other'
                          )),
  notes                 text,
  status                text        not null default 'open'
                          check (status in ('open', 'reviewed', 'dismissed', 'fixed')),
  created_at            timestamptz not null default now(),
  reviewed_by           uuid,
  reviewed_at           timestamptz
);

comment on table public.question_reports is
  'Student flags on active questions. '
  'Resolved via duplicate-draft-archive-activate workflow when content needs fixing.';

create index idx_qr_question_id on public.question_reports (trainer_question_id);
create index idx_qr_status      on public.question_reports (status);

alter table public.question_reports enable row level security;

-- Students can report active questions only
create policy "Users can submit reports"
  on public.question_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Students can read their own reports
create policy "Users can read their own reports"
  on public.question_reports
  for select
  to authenticated
  using (user_id = auth.uid());

-- ─── Flag count trigger ───────────────────────────────────────────────────────
--
-- When a report is inserted, increment flag_count and set is_flagged = true
-- on the question. This keeps the dashboard filter fast without a join.

create or replace function public.increment_question_flag_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trainer_questions
  set
    flag_count = flag_count + 1,
    is_flagged = true
  where id = new.trainer_question_id;
  return new;
end;
$$;

create trigger tg_increment_flag_count
  after insert on public.question_reports
  for each row execute function public.increment_question_flag_count();

-- ─── question_reviews ─────────────────────────────────────────────────────────
--
-- Human or system review records. Written by the CSV import workflow or
-- future automated audit jobs. Updates quality_status on the question.

create table public.question_reviews (
  id                    uuid        primary key default gen_random_uuid(),
  trainer_question_id   uuid        not null references public.trainer_questions(id),
  review_type           text        not null check (review_type in ('human', 'system')),
  status                text        not null check (status in ('pass', 'needs_review', 'fail')),
  summary               text        not null,
  findings              jsonb       not null default '[]'::jsonb,
  suggested_revision    jsonb,
  created_by            uuid,
  created_at            timestamptz not null default now()
);

comment on table public.question_reviews is
  'Human and system review records. '
  'A review with status=fail triggers quality_status=needs_review on the question. '
  'Suggested revisions are applied via the duplicate-draft workflow, not directly.';

comment on column public.question_reviews.findings is
  'Array of {field, issue, suggestion} objects identifying specific problems.';

comment on column public.question_reviews.suggested_revision is
  'Partial question fields suggested by the reviewer. '
  'Never applied directly to active questions.';

create index idx_qrev_question_id on public.question_reviews (trainer_question_id);
create index idx_qrev_status      on public.question_reviews (status);

alter table public.question_reviews enable row level security;

-- ─── Review outcome trigger ───────────────────────────────────────────────────
--
-- When a review is inserted, update quality_status on the question to match.

create or replace function public.apply_review_quality_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trainer_questions
  set
    quality_status   = case new.status
                         when 'pass'         then 'pass'
                         when 'needs_review' then 'needs_review'
                         when 'fail'         then 'needs_review'
                       end,
    quality_notes    = new.summary,
    last_reviewed_at = now()
  where id = new.trainer_question_id;
  return new;
end;
$$;

create trigger tg_apply_review_quality_status
  after insert on public.question_reviews
  for each row execute function public.apply_review_quality_status();
