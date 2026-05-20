# Question Lab Step-by-Step Implementation Plan

This is the practical build plan for the Question Lab system described in:

- `docs/QUESTION_STORAGE_SUMMARY_FOR_LLM.md`
- `docs/QUESTION_LAB_INFRASTRUCTURE_PLAN.md`

This version focuses on the foundation first: storage, dashboard, review workflow, reporting, and future mock readiness.

## Target Architecture

Use two separate question stores:

```text
trainer_questions
  authored skills-trainer drills
  used by current trainer pages

question_bank
  future full UCAT-format questions
  used by mini mocks, full mocks, and practice sets
```

Shared supporting tables:

```text
question_gold_standards
question_reviews
question_reports
question_media_assets
```

Procedural trainers such as Calculator and Mental Maths stay outside Question Lab.

## Core Workflow

For authored skills-trainer questions:

```text
gold standard -> draft question -> human review -> active question -> student RPC
```

For fixing an active question:

```text
duplicate active question as draft -> edit draft -> review -> archive old active row -> activate replacement
```

Do not directly edit active question content.

## File And Folder Plan

Create these files/folders:

```text
docs/
  QUESTION_STORAGE_SUMMARY_FOR_LLM.md
  QUESTION_LAB_INFRASTRUCTURE_PLAN.md
  QUESTION_LAB_STEP_BY_STEP_IMPLEMENTATION.md

question-lab/
  gold-standards/
    dm-venn-logic.md
    dm-data-logic.md
    dm-argument-judge.md
    sjt-appropriateness.md
    sjt-importance.md
    sjt-ranking.md
    qr-conversions.md
    inference.md
    vr-passages.md
  reports/
    .gitkeep
  snapshots/
    .gitkeep
```

Important rule:

```text
Gold-standard markdown files are seed/bootstrap content only.
After they are loaded into question_gold_standards, the database is canonical.
```

## Gold-Standard MD Seed Format

Each seed file should use this format:

```md
# Gold Standard: Data Logic

## Purpose
What this trainer/question type is supposed to teach.

## Required Qualities
- One unambiguous correct answer
- Distractors represent realistic UCAT traps
- Explanation teaches a transferable rule
- No outside knowledge required

## Required Fields
- section
- trainer_type
- question_kind
- difficulty
- skill_tag
- stem
- explanation
- content.question
- content.options
- content.correctAnswer

## Good Examples
Paste 2-5 excellent existing questions here.

## Bad Examples
Paste examples or patterns to avoid.

## Rejection Rules
- Reject if two options are defensible
- Reject if wording requires outside knowledge
- Reject if explanation only states the answer

## Review Checklist
- Is the stem clear?
- Is the correct answer uniquely correct?
- Are distractors plausible?
- Is the explanation educational?
- Is the difficulty label fair?
```

## Phase 0: Current State

Already completed:

- Created `docs/QUESTION_STORAGE_SUMMARY_FOR_LLM.md`
- Confirmed 15 trainers and their storage patterns
- Aligned DM local banks and `supabase/seed/dm_trainer_questions.json`
- DM seed now has:
  - Venn Logic: 35
  - Data Logic: 40
  - Argument Judge: 40

Useful checks:

```bash
npm run verify:dm-trainers
npm run build
```

## Phase 0.5: Local Gold-Standard MD Editor

Purpose: make the gold-standard files easy to edit before the full Supabase dashboard exists.

Initial implementation:

```text
/admin/question-lab/gold-standards
```

This page edits:

```text
question-lab/gold-standards/*.md
```

Development-only file access is provided by a Vite middleware endpoint:

```text
/__question-lab/gold-standards
```

Rules:

- only files inside `question-lab/gold-standards` are editable
- only `*.md` files with safe filenames are allowed
- this is a local authoring convenience, not the final production dashboard
- later, these MD files should seed `question_gold_standards`, and the database becomes canonical

This is the first practical step because it lets gold-standard questions, extracted image/PDF patterns, and rubrics be edited from one place.

## Phase 1: Define Shared Types

Purpose: prevent `content jsonb` from becoming vague.

Create:

```text
src/types/questionLab.ts
```

Add shared types:

```ts
export type QuestionSource = "trainer" | "ucat_bank";

export type QuestionStatus = "draft" | "active" | "archived";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionQualityStatus =
  | "unchecked"
  | "pass"
  | "needs_review"
  | "fail";

export type QuestionMediaPlacement =
  | "stem"
  | "option"
  | "explanation";

export type QuestionMediaAttachment = {
  assetId: string;
  placement: QuestionMediaPlacement;
  alt: string;
};
```

Add initial content shapes:

```ts
export type TrainerMCQContent = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  commonTrap?: string;
  review?: unknown;
};

export type SjtAppropriatenessContent = {
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

export type SjtImportanceContent = {
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

export type QrTrainerContent = {
  question: string;
  answerType: "mcq" | "numeric";
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  workedSolution: string;
  units?: string;
};
```

## Phase 2: Create Core Supabase Tables

Purpose: create the canonical skills-trainer store and support tables before dashboard work.

Create migration:

```text
supabase/migrations/YYYYMMDDHHMMSS_question_lab_core.sql
```

Add:

```text
trainer_questions
question_gold_standards
question_reviews
question_reports
question_media_assets
```

Use the schema from `docs/QUESTION_LAB_INFRASTRUCTURE_PLAN.md`.

Migration implementation note:

```text
Create question_gold_standards before adding FKs that reference it, or add those FKs after all tables exist.
```

Important constraints:

- `difficulty` must be constrained to `easy`, `medium`, `hard`
- `status` must be constrained to `draft`, `active`, `archived`
- `quality_status` must be constrained to `unchecked`, `pass`, `needs_review`, `fail`
- `question_reviews` and `question_reports` should use real nullable FKs, not `question_table text`
- no hard deletes for questions; archive instead

## Phase 3: Active Question Safety

Purpose: prevent accidental edits to live questions.

Implement both:

1. UI rule: active rows are view-only and show `Duplicate as draft`
2. DB rule: trigger blocks updates to core content fields while `status = 'active'`

Allowed active-row updates:

- `quality_status`
- `quality_notes`
- `last_reviewed_at`
- `is_flagged`
- `flag_count`
- `updated_at`

Blocked active-row updates:

- `stem`
- `explanation`
- `content`
- `media`
- `difficulty`
- `skill_tag`
- `trainer_type`
- `question_kind`

## Phase 4: Gold Standards

Purpose: define the quality bar before writing or reviewing more questions.

### 4.1 Create MD Seed Files

Start with:

```text
question-lab/gold-standards/dm-venn-logic.md
question-lab/gold-standards/dm-data-logic.md
question-lab/gold-standards/dm-argument-judge.md
```

Then add:

```text
question-lab/gold-standards/sjt-appropriateness.md
question-lab/gold-standards/sjt-importance.md
question-lab/gold-standards/sjt-ranking.md
question-lab/gold-standards/qr-conversions.md
```

### 4.2 Seed Into Supabase

Load the MD content into `question_gold_standards`.

After this point:

```text
question_gold_standards is canonical.
MD files are historical/bootstrap references only.
```

### 4.3 Gold Standard Versioning

When a gold standard changes:

1. create a new version
2. keep the old version for history
3. mark related active questions as `quality_status = 'needs_review'`

## Phase 5: Migrate DM Into `trainer_questions`

Purpose: prove the new model with the cleanest authored trainer bank.

Source:

```text
src/data/dmTrainers/vennLogicQuestions.ts
src/data/dmTrainers/dataLogicQuestions.ts
src/data/dmTrainers/argumentJudgeQuestions.ts
supabase/seed/dm_trainer_questions.json
```

Migration mapping:

| Old field | New field |
|---|---|
| `id` | `legacy_id` |
| trainer table/category | `trainer_type` |
| `dm` | `section` |
| MCQ format | `question_kind = 'mcq'` |
| difficulty | `difficulty` |
| skill tag/category | `skill_tag` |
| stem/context | `stem` |
| explanation | `explanation` |
| options/correct answer/common trap/review | `content` |
| existing live rows | `status = 'active'` |

After migration, keep the old DM table temporarily as rollback reference only.

Retirement rule:

```text
Once DM RPCs read from trainer_questions and production has been verified, do not keep dm_trainer_questions as a second active source.
```

## Phase 6: Update DM Runtime RPCs

Purpose: protect delivery and stop relying on bundled banks in production.

Update DM student RPCs to read from:

```text
public.trainer_questions
```

Rules:

- `where status = 'active'`
- `where section = 'dm'`
- filter by `trainer_type`
- return named columns only
- never `select *`
- do not return quality notes, report fields, admin notes, or inactive rows

Example public fields:

```text
id
trainer_type
question_kind
difficulty
stem
explanation
content
media
```

Production local fallback:

```text
Remove only after logging and a friendly "questions unavailable" state exist.
```

## Phase 7: Build Question Lab Dashboard v1

Purpose: make the system usable without command line.

Add route:

```text
/admin/question-lab
```

Recommended page:

```text
src/pages/admin/QuestionLabPage.tsx
```

Reuse existing admin auth/role patterns from `AdminPage.tsx`.

Start with these tabs:

```text
Trainer Questions
Gold Standards
Review Queue
Reports
Coverage
CSV Review
```

Do not build UCAT Bank or mock tabs yet.

### 7.1 Trainer Questions Tab

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

Columns:

- legacy ID
- trainer type
- difficulty
- skill tag
- status
- quality status
- flag count
- updated at

Actions:

- view
- create draft
- duplicate as draft
- review
- activate
- archive

### 7.2 Editor

Use structured forms based on `question_kind`.

For `mcq`:

- stem
- content.question
- options A-D
- correct answer
- explanation
- skill tag
- common trap
- review notes
- difficulty
- media

Activation rule:

```text
Cannot activate if required fields or deterministic validation fail.
```

### 7.3 Review Queue

Shows:

- drafts waiting for review
- active questions marked `needs_review`
- questions with open reports
- questions stale against their gold standard

Review outcomes:

- pass
- needs_review
- fail

### 7.4 Reports

Shows rows from `question_reports`.

Minimum actions:

- mark reviewed
- dismiss
- duplicate question as draft to fix
- mark fixed after replacement activates

### 7.5 Coverage

Counts by:

- section
- trainer type
- skill tag
- difficulty
- status
- quality status

Use this to decide what to write next.

### 7.6 CSV Review

Purpose: allow cheap manual review using your existing ChatGPT/Claude subscription.

Export selected questions as CSV with:

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

Prompt ChatGPT/Claude with:

```text
Please review these questions against the included gold-standard rubric.
Do not rewrite official material.
Return one CSV row per question with:
id, review_status, review_summary, review_findings,
suggested_stem, suggested_explanation, suggested_content_json.
Only suggest edits where necessary.
```

Import reviewed CSV with:

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

- create a `question_reviews` row for every imported review
- never overwrite active question content directly
- if suggested edits exist for an active question, create a draft replacement
- validate `suggested_content_json` before saving
- show a preview before accepting the import

## Phase 8: Student Flagging

Purpose: let students report bad or ambiguous questions.

Add a small "Report issue" action in trainer UI.

Create RPC:

```text
report_question(question_source, question_id, reason, notes)
```

Rules:

- students can only report active questions
- reason must use a fixed enum
- notes can be optional
- RPC inserts into `question_reports`
- RPC increments `flag_count` and sets `is_flagged = true`

This does not need to block the Phase 7 dashboard, but the schema should exist before then.

## Phase 9: Migrate SJT Into `trainer_questions`

Purpose: bring the next authored trainer bank into the same workflow.

Tasks:

1. migrate current SJT rows into `trainer_questions`
2. set `section = 'sjt'`
3. set `trainer_type` to `sjt-appropriateness`, `sjt-importance`, or `sjt-ranking`
4. use the relevant SJT content shape
5. update SJT RPCs to read active named columns from `trainer_questions`
6. add SJT editor forms
7. seed SJT gold standards into the DB

## Phase 10: QR And Images

Purpose: support authored QR trainer questions and image/table assets.

QR conversions can move into `trainer_questions` if protection/dashboard editing is desired.

Media rules:

- protected media lives in private Supabase Storage
- no protected question images in `/public`
- no base64 media in question JSON
- activation requires alt text
- student RPC returns media references
- rendering layer requests signed URLs only for the current question

Reuse existing frontend pieces where possible:

```text
src/components/media/QuestionMediaBlock.tsx
src/lib/questionMedia.ts
src/types/questionMedia.ts
```

## Phase 11: Passage-Based Trainers

Purpose: handle VR/inference later without breaking evidence spans.

Do not migrate passages until the passage edit policy is built.

Recommended simple policy:

```text
Active passages referenced by active questions are locked.
To edit a passage, duplicate it as draft and create replacement questions.
```

This avoids silently breaking evidence spans that rely on exact passage text.

## Phase 12: Future UCAT Bank And Mini Mocks

Purpose: prepare for full UCAT-format practice without mixing it with skills trainers.

Create later:

```text
question_bank
passage_bank
question_sets
question_set_items
mock_attempts
mock_answers
```

`question_bank` should include from day one:

- section
- question_type
- difficulty
- skill_tag
- estimated_time_seconds
- difficulty_calibration
- passage_id
- content
- media

Mini mocks and mocks should reference `question_bank` only.

Skills trainer questions should not appear in official mini mocks unless deliberately rewritten/imported as UCAT-bank questions.

## Implementation Order Summary

| Order | Work | Outcome |
|---:|---|---|
| 1 | Define TypeScript content shapes | JSON content stays controlled |
| 2 | Create `trainer_questions` and support tables | Single authored trainer store |
| 3 | Add active-question edit protection | Live questions cannot be silently broken |
| 4 | Create gold-standard MD seeds and load DB | One canonical quality bar |
| 5 | Migrate DM into `trainer_questions` | First trainer bank unified |
| 6 | Update DM RPCs | Secure active-only runtime delivery |
| 7 | Build dashboard v1 | No command-line editing |
| 8 | Add CSV export/import review | Cheap manual ChatGPT/Claude audit loop |
| 9 | Add student reports | Students can flag issues |
| 10 | Migrate SJT | Same workflow for SJT |
| 11 | Add QR/images | Supports richer authored trainers |
| 12 | Decide passage locking and migrate passages | Avoids evidence-span breakage |
| 13 | Add `question_bank` and mock tables | Future timed mini mocks/full mocks |

## Minimal First Milestone

Build only this first:

```text
DM Skills Trainer Question Lab v1
```

Includes:

- `trainer_questions`
- common TypeScript content shapes
- DM migration into `trainer_questions`
- DM gold standards seeded into `question_gold_standards`
- active-question duplicate/archive replacement workflow
- `question_reviews`
- `question_reports`
- CSV export/import review workflow
- DM RPC reads active named columns from `trainer_questions`
- dashboard tabs for Trainer Questions, Gold Standards, Review Queue, Reports, and Coverage
- production fallback disabled only after logging/unavailable-state handling exists

This proves the safe loop:

```text
draft -> review -> active -> report if wrong -> duplicate/fix -> replace
```

Once that works, copy the pattern to SJT.
