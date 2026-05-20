# Question Lab Master Plan

This is the single implementation plan for building a simple, robust Question Lab.

Use this file first. It consolidates the previous storage summary, infrastructure plan, implementation plan, and DM seeding audit into one source of truth.

## Goal

Build a system that lets us:

1. Create better skills-trainer questions
2. Review and improve existing questions
3. Protect authored questions from mass copying
4. Use gold-standard examples and extracted patterns
5. Later support full UCAT mini mocks, full mocks, and timed practice sets

## Current Status

Completed so far:

- Documented all 15 current skills trainers and where their questions live
- Fixed and aligned the DM local banks and Supabase seed JSON
- Created starter gold-standard MD files
- Added image/PDF extraction blueprints to the gold-standard MD files
- Built a local editor for the gold-standard MD files

Local editor:

```text
/admin/question-lab/gold-standards
```

Files edited by that page:

```text
question-lab/gold-standards/*.md
```

Local-only file API:

```text
/__question-lab/gold-standards
```

This file API is free and only reads/writes repo files during local development.

## Current Question Storage

The current app has 15 public skills trainers.

| # | Trainer | Section | Current storage pattern | Future treatment |
|---:|---|---|---|---|
| 1 | Speed Reading | VR | local passages + generated questions | keep procedural/local for now |
| 2 | Rapid Recall | VR | local passages + generated questions | keep procedural/local for now |
| 3 | Keyword Scanning | VR | local passages + generated targets | keep procedural/local for now |
| 4 | Inference | VR | local passages + authored spans | migrate later only after passage strategy |
| 5 | Syllogism Micro | DM | generated rows in Supabase | keep generator code local |
| 6 | Syllogism Macro | DM | generated rows in Supabase | keep generator code local |
| 7 | Venn Logic | DM | local TS + Supabase seed/runtime | migrate first into `trainer_questions` |
| 8 | Data Logic | DM | local TS + Supabase seed/runtime | migrate first into `trainer_questions` |
| 9 | Argument Judge | DM | local TS + Supabase seed/runtime | migrate first into `trainer_questions` |
| 10 | Calculator | QR | procedural generator | keep outside Question Lab |
| 11 | Mental Maths | QR | procedural generator + small fixed set | keep outside Question Lab for now |
| 12 | Conversions | QR | local authored bank | migrate if protection/dashboard editing is wanted |
| 13 | SJT Appropriateness | SJT | Supabase seed/runtime | migrate after DM into `trainer_questions` |
| 14 | SJT Importance | SJT | Supabase seed/runtime | migrate after DM into `trainer_questions` |
| 15 | SJT Ranking | SJT | Supabase seed/runtime | migrate after DM into `trainer_questions` |

Current local counts:

| Bank | Count |
|---|---:|
| VR passages | 105 |
| Inference questions | 343 |
| Conversion questions | 35 |
| DM trainer questions total | 115 |
| Venn Logic | 35 |
| Data Logic | 40 |
| Argument Judge | 40 |
| SJT seed rows total | 86 |
| SJT Appropriateness | 30 |
| SJT Importance | 29 |
| SJT Ranking | 27 |

## Core Architecture Decision

Use two question stores, not one giant table.

| Store | Purpose | Used by |
|---|---|---|
| `trainer_questions` | Authored skills-trainer drills | Current trainer pages |
| `question_bank` | Full UCAT-format questions | Future mini mocks, full mocks, practice sets |

Why:

- Skills-trainer questions teach isolated skills.
- UCAT-bank questions are exam-format, timed, and used in mocks.
- Mixing them in one table would blur product meaning.
- Keeping them separate still allows shared reviews, reports, media, and gold standards.

Shared support tables:

```text
question_gold_standards
question_reviews
question_reports
question_media_assets
```

Future mock tables:

```text
question_sets
question_set_items
mock_attempts
mock_answers
```

## Gold Standards

Gold standards define what good questions look like.

Starter files:

```text
question-lab/gold-standards/dm-venn-logic.md
question-lab/gold-standards/dm-data-logic.md
question-lab/gold-standards/dm-argument-judge.md
question-lab/gold-standards/sjt-appropriateness.md
question-lab/gold-standards/sjt-importance.md
question-lab/gold-standards/sjt-ranking.md
question-lab/gold-standards/qr-conversions.md
question-lab/gold-standards/inference.md
question-lab/gold-standards/vr-passages.md
```

Important rule:

```text
MD files are seed/bootstrap content.
After they are loaded into question_gold_standards, the database becomes canonical.
Do not maintain MD and database as two long-term sources of truth.
```

### Image/PDF Extraction Rule

Official-style PDFs and screenshots should be used to extract patterns, not copied questions.

Do not store long-term:

- exact official wording
- exact official numbers
- official screenshots
- near-copy rewritten questions

Store:

- question type
- visual type
- what information is given
- what the student must find
- reasoning pattern
- common trap
- difficulty
- visual requirements for a new original version
- what must vary in a new original version

Example extracted Venn pattern:

```md
### Pattern: Exactly One Set

- Visual type: Three-circle Venn diagram
- Generic set labels: three activities or preferences
- Given information: total group size, set totals, pairwise overlaps
- Task: find the number in exactly one set
- Reasoning pattern: inclusion-exclusion and double-counting control
- Common trap: confusing exactly one with at least one
- Difficulty: medium
- Visual requirements: clean three-set diagram with visible region counts
- New original version must vary: context, labels, numbers, wording, answer
```

## Data Model

### `trainer_questions`

Canonical table for authored skills-trainer questions.

```sql
create table public.trainer_questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  section text not null check (section in ('vr', 'dm', 'qr', 'sjt')),
  trainer_type text not null,
  question_kind text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  skill_tag text,
  stem text not null,
  explanation text,
  content jsonb not null,
  media jsonb not null default '[]'::jsonb,
  quality_status text not null default 'unchecked'
    check (quality_status in ('unchecked', 'pass', 'needs_review', 'fail')),
  quality_notes text,
  last_reviewed_at timestamptz,
  gold_standard_id uuid references public.question_gold_standards(id),
  gold_standard_version integer,
  is_flagged boolean not null default false,
  flag_count integer not null default 0,
  replaces_question_id uuid references public.trainer_questions(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:

- `legacy_id` preserves old IDs such as `venn-logic-001`.
- `content` stores type-specific question payload.
- Common editorial fields stay as real columns for filtering.
- `replaces_question_id` records draft replacements for active questions.

### Content Shapes

Define these in:

```text
src/types/questionLab.ts
```

Core types:

```ts
export type QuestionSource = "trainer" | "ucat_bank";
export type QuestionStatus = "draft" | "active" | "archived";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionQualityStatus = "unchecked" | "pass" | "needs_review" | "fail";

export type QuestionMediaAttachment = {
  assetId: string;
  placement: "stem" | "option" | "explanation";
  alt: string;
};
```

DM/QR MCQ shape:

```ts
export type TrainerMCQContent = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  commonTrap?: string;
  review?: unknown;
};
```

SJT rating shape:

```ts
export type SjtRatingContent = {
  domain: string;
  pivotInsight?: string;
  gmpReference?: string;
  items: Array<{
    text: string;
    score: 1 | 2 | 3 | 4;
    label: string;
    explanation?: string;
  }>;
};
```

SJT ranking shape:

```ts
export type SjtRankingContent = {
  domain: string;
  pivotInsight?: string;
  gmpReference?: string;
  items: Array<{
    text: string;
    rank: number;
    explanation?: string;
  }>;
};
```

QR authored shape:

```ts
export type QrTrainerContent = {
  question: string;
  answerType: "mcq" | "numeric";
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  workedSolution: string;
  units?: string;
};
```

### `question_gold_standards`

```sql
create table public.question_gold_standards (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('trainer', 'ucat_bank')),
  trainer_type text,
  question_type text,
  question_kind text,
  version integer not null default 1,
  title text not null,
  rubric text not null,
  required_fields jsonb not null default '[]'::jsonb,
  good_examples jsonb not null default '[]'::jsonb,
  bad_examples jsonb not null default '[]'::jsonb,
  rejection_rules jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

When a gold standard changes:

1. create a new version
2. keep the old version
3. mark related active questions as `quality_status = 'needs_review'`

### `question_reviews`

Stores human/system reviews.

```sql
create table public.question_reviews (
  id uuid primary key default gen_random_uuid(),
  trainer_question_id uuid references public.trainer_questions(id),
  bank_question_id uuid references public.question_bank(id),
  review_type text not null check (review_type in ('human', 'system')),
  status text not null check (status in ('pass', 'needs_review', 'fail')),
  summary text not null,
  findings jsonb not null default '[]'::jsonb,
  suggested_revision jsonb,
  gold_standard_id uuid references public.question_gold_standards(id),
  gold_standard_version integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (
    (trainer_question_id is not null and bank_question_id is null)
    or
    (trainer_question_id is null and bank_question_id is not null)
  )
);
```

Use real nullable FKs instead of `question_table text`.

### `question_reports`

Stores student flags.

```sql
create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  trainer_question_id uuid references public.trainer_questions(id),
  bank_question_id uuid references public.question_bank(id),
  user_id uuid,
  reason text not null check (
    reason in ('typo', 'ambiguous', 'wrong_answer', 'bad_explanation', 'technical_issue', 'other')
  ),
  notes text,
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed', 'fixed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  check (
    (trainer_question_id is not null and bank_question_id is null)
    or
    (trainer_question_id is null and bank_question_id is not null)
  )
);
```

Student report RPC:

```text
report_question(question_source, question_id, reason, notes)
```

Rules:

- students can only report active questions
- reason uses fixed enum
- notes are optional
- RPC inserts report
- RPC increments `flag_count` and sets `is_flagged = true`

### `question_media_assets`

```sql
create table public.question_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'question-media',
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'table_image', 'diagram')),
  alt_text text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid,
  created_at timestamptz not null default now()
);
```

Rules:

- protected media goes in private Supabase Storage
- no protected question images in `/public`
- no base64 images inside question JSON
- activation requires alt text
- student UI receives signed URLs only for the current question

### Future `question_bank`

Full UCAT questions only.

```sql
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  section text not null check (section in ('vr', 'dm', 'qr', 'sjt')),
  question_type text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  skill_tag text,
  stem text not null,
  explanation text,
  content jsonb not null,
  media jsonb not null default '[]'::jsonb,
  passage_id uuid references public.passage_bank(id),
  estimated_time_seconds integer,
  difficulty_calibration numeric,
  quality_status text not null default 'unchecked'
    check (quality_status in ('unchecked', 'pass', 'needs_review', 'fail')),
  quality_notes text,
  last_reviewed_at timestamptz,
  gold_standard_id uuid references public.question_gold_standards(id),
  gold_standard_version integer,
  is_flagged boolean not null default false,
  flag_count integer not null default 0,
  replaces_question_id uuid references public.question_bank(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Future `passage_bank`

```sql
create table public.passage_bank (
  id uuid primary key default gen_random_uuid(),
  section text not null default 'vr' check (section in ('vr', 'dm', 'qr', 'sjt')),
  title text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  topic text,
  media jsonb not null default '[]'::jsonb,
  quality_status text not null default 'unchecked'
    check (quality_status in ('unchecked', 'pass', 'needs_review', 'fail')),
  quality_notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Passage safety rule:

```text
Active passages referenced by active questions are locked.
To edit a passage, duplicate it as draft and create replacement questions.
```

This avoids silently breaking inference evidence spans.

### Future Mock Tables

```sql
create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  set_type text not null check (set_type in ('practice', 'mini_mock', 'full_mock')),
  section text check (section in ('vr', 'dm', 'qr', 'sjt')),
  time_limit_seconds integer,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.question_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets(id),
  question_id uuid not null references public.question_bank(id),
  position integer not null,
  section_time_limit_seconds integer,
  unique (set_id, position)
);

create table public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  set_id uuid not null references public.question_sets(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score_data jsonb
);

create table public.mock_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id),
  question_id uuid not null references public.question_bank(id),
  user_answer jsonb,
  is_correct boolean,
  time_taken_seconds integer,
  answered_at timestamptz
);
```

Mocks should reference `question_bank`, not `trainer_questions`.

## Active Question Safety

Do not directly edit active authored questions.

Safe workflow:

1. duplicate active question as draft
2. edit the draft
3. review the draft
4. archive original active question
5. activate replacement

Recommended enforcement:

- UI hides direct editing for active rows
- database trigger blocks changes to core content fields while `status = 'active'`
- allow active-row updates only for review/report metadata

Blocked for active rows:

- `stem`
- `explanation`
- `content`
- `media`
- `difficulty`
- `skill_tag`
- `trainer_type`
- `question_kind`

Allowed for active rows:

- `quality_status`
- `quality_notes`
- `last_reviewed_at`
- `is_flagged`
- `flag_count`
- `updated_at`

## Security Rules

1. No public direct `SELECT` access to protected question tables.
2. Student-facing RPCs must filter `status = 'active'`.
3. Student-facing RPCs must name return columns explicitly. Never use `select *`.
4. Student-facing RPCs must return limited batches only.
5. Admin writes require admin role checks.
6. No Supabase service-role key in frontend code.
7. Protected media uses private storage and signed URLs.
8. Production builds must not include protected local fallback banks.
9. Removing local fallback requires logging and a friendly unavailable state.

Student RPC pattern:

```sql
select
  id,
  trainer_type,
  question_kind,
  difficulty,
  stem,
  explanation,
  content,
  media
from public.trainer_questions
where status = 'active'
  and trainer_type = p_trainer_type
limit p_count;
```

## Dashboard Plan

First proper dashboard:

```text
/admin/question-lab
```

Keep the existing `/admin` analytics page separate.

First tabs:

```text
Trainer Questions
Gold Standards
Review Queue
Reports
Coverage
CSV Review
```

Later tabs:

```text
UCAT Bank
Question Sets
Media
```

### Trainer Questions

Filters:

- section
- trainer type
- question kind
- status
- quality status
- difficulty
- skill tag
- flagged
- search

Actions:

- view
- create draft
- duplicate as draft
- review
- activate
- archive
- resolve reports

Active rows show `Duplicate as draft`, not direct edit.

### Gold Standards

Features:

- show active rubric version
- create new version
- show good examples
- show bad examples
- show rejection rules
- mark related questions stale when a standard changes

### Review Queue

Shows:

- drafts awaiting review
- active questions marked `needs_review`
- questions with open reports
- questions stale against gold-standard version

Review outcomes:

- `pass`
- `needs_review`
- `fail`

### Reports

Shows `question_reports`.

Workflow:

```text
open -> reviewed -> dismissed
open -> reviewed -> fixed
```

If fixed, use duplicate-draft-archive-activate.

### Coverage

Counts by:

- source
- section
- trainer type/question type
- skill tag
- difficulty
- status
- quality status

### CSV Review

Purpose:

```text
Use dashboard/database for storage.
Use ChatGPT/Claude subscription manually for bulk review.
Avoid paid per-question API review until automation is clearly worth it.
```

Export selected questions as CSV:

```text
id
legacy_id
section
trainer_type
question_kind
difficulty
skill_tag
status
stem
explanation
content_json
gold_standard_title
gold_standard_rubric
```

Import reviewed CSV:

```text
id
review_status
review_summary
review_findings
suggested_stem
suggested_explanation
suggested_content_json
```

Import rules:

- create `question_reviews` rows
- never overwrite active question content directly
- suggested edits to active questions create draft replacements
- validate `suggested_content_json`
- show preview before saving import

## AI/OpenRouter Position

AI is useful, but not required for the first proper build.

Best future use:

```text
gold standard + existing approved questions + target skill gap
-> AI drafts new questions
-> deterministic validation
-> human review
-> activate
```

Good AI tasks:

- draft new questions
- improve explanations
- suggest distractors
- identify ambiguity
- produce common traps
- create variants by difficulty

Guardrail:

```text
AI can suggest, draft, and review.
AI cannot publish.
```

Manual low-cost review option:

```text
export CSV -> review in ChatGPT/Claude subscription -> import CSV
```

## Implementation Order

| Order | Work | Outcome |
|---:|---|---|
| 0 | Populate DM gold-standard MD files | Quality bar exists |
| 1 | Define TypeScript content shapes | JSON content stays controlled |
| 2 | Create `trainer_questions` and support tables | Single authored trainer store |
| 3 | Add active-question edit protection | Live questions cannot be silently broken |
| 4 | Seed gold standards into DB | One canonical quality bar |
| 5 | Migrate DM into `trainer_questions` | First trainer bank unified |
| 6 | Update DM RPCs | Secure active-only runtime delivery |
| 7 | Build dashboard v1 | No command-line editing |
| 8 | Add CSV export/import review | Cheap manual audit loop |
| 9 | Add student reports | Students can flag issues |
| 10 | Migrate SJT | Same workflow for SJT |
| 11 | Add QR/images | Supports richer authored trainers |
| 12 | Decide passage locking and migrate passages | Avoids evidence-span breakage |
| 13 | Add `question_bank` and mock tables | Future timed mini mocks/full mocks |

## Minimal First Proper Build

Build:

```text
DM Skills Trainer Question Lab v1
```

Includes:

- `src/types/questionLab.ts`
- `trainer_questions`
- `question_gold_standards`
- `question_reviews`
- `question_reports`
- DM migration into `trainer_questions`
- DM RPC reads active named columns from `trainer_questions`
- active-question duplicate/archive replacement workflow
- dashboard tabs: Trainer Questions, Gold Standards, Review Queue, Reports, Coverage, CSV Review
- production local fallback disabled only after logging/unavailable-state handling exists

Proof loop:

```text
draft -> review -> active -> report if wrong -> duplicate/fix -> replace
```

## What To Populate Before Building More

Populate these first:

```text
question-lab/gold-standards/dm-venn-logic.md
question-lab/gold-standards/dm-data-logic.md
question-lab/gold-standards/dm-argument-judge.md
```

Minimum useful content per file:

- 10-20 extracted official-style patterns
- 3-5 strong original examples from the current bank
- common traps
- rejection rules
- review checklist

Do not wait to perfect all nine gold-standard files. DM first is enough to build the first real dashboard.

## Useful Commands

| Task | Command |
|---|---|
| Start local app | `npm run dev -- --host 127.0.0.1` |
| Build/typecheck | `npm run build` |
| Verify DM trainer questions | `npm run verify:dm-trainers` |
| Export and seed DM trainer questions | `npm run seed:dm-trainers` |
| Verify conversion questions | `npm run verify:conversion-questions` |
| Export SJT JSON | `npm run export:sjt` |
| Seed SJT questions | `npm run seed:sjt` |
| Seed generated syllogisms | `npm run seed:syllogisms` |
| Verify QR maths generators | `npm run verify:qr-maths` |

## Decisions Already Made

| Question | Decision |
|---|---|
| One table for everything? | No. Use `trainer_questions` and `question_bank`. |
| Keep DM/SJT old tables forever? | No. Migrate and retire as active sources. |
| Directly edit active questions? | No. Duplicate as draft and replace. |
| MD and DB both canonical? | No. MD seeds DB; DB becomes canonical. |
| Procedural generators in Question Lab? | No. Keep generator code local. |
| Images public? | No. Use private storage and signed URLs. |
| Mocks use trainer questions? | No. Mocks use `question_bank`. |
| AI publishes questions? | No. Human approval required. |

## Success Criteria

The first proper implementation succeeds when:

- Admin can manage DM questions without command line.
- Current DM questions are served from `trainer_questions`.
- Students receive only active questions through named-column RPCs.
- Protected questions are not bundled into production frontend JS.
- Active questions cannot be silently overwritten.
- Gold standards have one canonical database home after seeding.
- Student reports can flag bad questions.
- CSV review/import works for manual ChatGPT/Claude review.
- The same pattern can be extended to SJT and QR.
- Future mini mocks have a clear separate schema path.
