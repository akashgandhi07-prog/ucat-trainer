-- Per-question feedback for DM & VR trainers.
-- Stores structured reports about individual questions so admins can review content quality.

create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  trainer_type text not null,
  question_kind text not null,
  question_identifier text not null,
  issue_type text not null,
  comment text,
  passage_id text,
  session_id uuid,
  page_url text,
  created_at timestamptz not null default now()
);

-- Enumerated issue types: keep in sync with frontend QuestionFeedbackIssueType.
alter table public.question_feedback drop constraint if exists question_feedback_issue_type_check;
alter table public.question_feedback add constraint question_feedback_issue_type_check
  check (issue_type in ('wrong_answer', 'unclear_wording', 'too_hard', 'too_easy', 'typo', 'other'));

-- Length limits to prevent abuse.
alter table public.question_feedback drop constraint if exists question_feedback_comment_length_check;
alter table public.question_feedback add constraint question_feedback_comment_length_check
  check (comment is null or length(comment) <= 1000);

alter table public.question_feedback drop constraint if exists question_feedback_page_url_length_check;
alter table public.question_feedback add constraint question_feedback_page_url_length_check
  check (page_url is null or length(page_url) <= 255);

-- Indexes to support admin queries by question and recency.
create index if not exists question_feedback_question_idx
  on public.question_feedback (trainer_type, question_kind, question_identifier);

create index if not exists question_feedback_created_at
  on public.question_feedback (created_at desc);

-- RLS: allow inserts from authenticated users (optionally linked to their user_id),
-- and anonymous inserts when user_id is null. Only admins can read.
alter table public.question_feedback enable row level security;

drop policy if exists "Users can insert question feedback" on public.question_feedback;
create policy "Users can insert question feedback"
  on public.question_feedback for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Anyone can insert anonymous question feedback" on public.question_feedback;
create policy "Anyone can insert anonymous question feedback"
  on public.question_feedback for insert
  to anon
  with check (user_id is null);

drop policy if exists "Admins can view question feedback" on public.question_feedback;
create policy "Admins can view question feedback"
  on public.question_feedback for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

comment on table public.question_feedback is
  'Per-question feedback (issue type + optional comment) for Decision Making and Verbal Reasoning trainers.';

