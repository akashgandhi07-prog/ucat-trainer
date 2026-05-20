# Question Lab Infrastructure Plan

This plan builds on `docs/QUESTION_STORAGE_SUMMARY_FOR_LLM.md`.

Goal: create the simplest robust system for:

1. Writing new skills-trainer questions
2. Reviewing and improving existing skills-trainer questions
3. Protecting authored questions from mass copying
4. Supporting future timed UCAT mini mocks, full mocks, and practice sets

This plan deliberately separates **skills trainer questions** from **full UCAT question-bank questions**.

## Core Decision: Two Stores, Shared Infrastructure

There are two different content types:

| Store | Purpose | Examples | Used by |
|---|---|---|---|
| `trainer_questions` | Targeted skills-trainer drills | DM Venn Logic, DM Data Logic, SJT ranking, QR conversions | Current trainer pages |
| `question_bank` | Full-format UCAT questions | Timed QR items, VR passage sets, full DM/SJT sections | Future mini mocks, full mocks, practice sets |

The two stores should remain separate because a skills-trainer drill and a full UCAT mock question are not the same product object.

They should share the same supporting infrastructure:

```text
Admin Question Lab
  - browse
  - create
  - duplicate draft
  - review
  - activate/archive
  - view reports
  - manage gold standards
        |
        v
Secure Supabase layer
  - admin-only writes
  - student RPCs
  - private media
  - active-only delivery
        |
        +-------------------------+
        |                         |
        v                         v
trainer_questions          question_bank
skills trainers            future UCAT mocks/practice
```

## Guiding Decisions

| Decision | Reason |
|---|---|
| Supabase is canonical for protected authored questions | Keeps full banks out of the public frontend bundle. |
| Skills trainers use `trainer_questions` | One editorial system for authored trainer drills without mixing them into future mocks. |
| Full UCAT mocks use `question_bank` | Timed mock questions need different fields and scoring infrastructure. |
| Gold standards are canonical in the database | Avoids markdown/database drift. Markdown files are seed/bootstrap content only. |
| Active questions are not directly edited | Fixes happen by duplicating as draft, archiving the old row, and activating the replacement. |
| Procedural trainers stay outside Question Lab | Calculator, Mental Maths, and similar generators are code, not authored question banks. |
| Student delivery is RPC-only | Students receive only named public fields for active questions. |

## Current System Mapping

`QUESTION_STORAGE_SUMMARY_FOR_LLM.md` shows the current mixed model:

- DM is local TypeScript plus Supabase seed/runtime.
- SJT is Supabase-backed at runtime.
- QR conversions are local.
- Inference and VR passage trainers use local passages.
- Calculator and Mental Maths are procedural.
- Syllogism trainers use generated Supabase rows.

Recommended treatment:

| Current area | Treatment |
|---|---|
| DM Venn/Data/Argument | Migrate into `trainer_questions` first. Update DM RPCs to read from it. |
| SJT | Migrate into `trainer_questions` after DM. Update SJT RPCs to read from it. |
| QR Conversions | Move into `trainer_questions` if protection/dashboard editing is needed. |
| Inference authored questions | Move into `trainer_questions` only after passage strategy is decided. |
| VR passages | Move to `passage_bank` later if they need protection/dashboard editing. |
| Calculator/Mental Maths | Keep procedural generator code local. Do not put generated throwaway items in Question Lab. |
| Syllogisms | Keep generator code local. Store generated active rows only if runtime needs Supabase delivery. |
| Future mini mocks/full mocks | Use `question_bank`, `question_sets`, and attempt tables only. |

## Data Model

### Migration Exit Path

Do not keep the old per-trainer authored tables as permanent production sources.

For each migrated area:

1. migrate rows into `trainer_questions`
2. keep the old table/seed as a temporary rollback reference
3. repoint student RPCs to `trainer_questions`
4. verify production delivery
5. mark the old table/seed as retired in docs

This avoids permanent dual-track maintenance.

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

- `legacy_id` preserves current IDs such as `venn-logic-001` for migration traceability.
- `content` stores the type-specific payload.
- Shared editorial fields stay as normal columns so filtering/reporting remains simple.
- `replaces_question_id` records the relationship when an active question is fixed by a new draft.

### Required Content Shapes

The JSON in `content` must not become a mystery box. Define TypeScript shapes before building the dashboard.

```ts
export type TrainerQuestionStatus = "draft" | "active" | "archived";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionQualityStatus = "unchecked" | "pass" | "needs_review" | "fail";

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

Add more shapes as new authored trainer types move into Question Lab.

### `question_bank`

Canonical table for future full UCAT questions used in timed practice, mini mocks, and full mocks.

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

This table is not needed for the first skills-trainer milestone, but its shape should be agreed now so future mocks do not require an awkward redesign.

### `passage_bank`

For future VR, inference, and passage-based UCAT questions.

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

Passage-editing rule:

```text
Do not allow direct edits to an active passage once active questions reference it.
Duplicate as draft, create replacement questions if needed, then archive the old passage.
```

This is simpler and safer than trying to preserve evidence spans through arbitrary text edits.

### `question_gold_standards`

Gold standards define the quality bar for a trainer type or UCAT question type.

Markdown files in `question-lab/gold-standards/` are seed content only. After seeding, this table is canonical.

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

When a gold standard changes, mark related active questions as stale:

```text
quality_status = 'needs_review'
gold_standard_version < active gold standard version
```

### `question_reviews`

Reviews are human/system checks of question quality. This keeps the first build focused on the editorial workflow rather than automation.

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

This keeps referential integrity without forcing trainer questions and UCAT bank questions into one table.

### `question_reports`

Students are often the first people to notice ambiguity or errors. Capture reports simply.

```sql
create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  trainer_question_id uuid references public.trainer_questions(id),
  bank_question_id uuid references public.question_bank(id),
  user_id uuid,
  reason text not null check (reason in ('typo', 'ambiguous', 'wrong_answer', 'bad_explanation', 'technical_issue', 'other')),
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

Student-facing report RPC:

```text
report_question(question_source, question_id, reason, notes)
```

The RPC should insert a report and increment `flag_count`/`is_flagged`.

### `question_media_assets`

Metadata for images, tables, and diagrams used in questions.

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

Store actual files in a private Supabase Storage bucket named `question-media`.

Question rows reference media using JSON:

```json
[
  {
    "assetId": "uuid",
    "placement": "stem",
    "alt": "Bar chart showing weekly clinic attendance"
  }
]
```

## Future Mock Tables

Mocks should use `question_bank` only, not `trainer_questions`.

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

The first build does not need these tables, but `question_bank` already includes `estimated_time_seconds` and `difficulty_calibration` so mocks have somewhere to grow.

## Active Question Safety Policy

Do not directly edit active authored questions.

Workflow:

1. Duplicate active question as draft.
2. Edit the draft.
3. Review against the relevant gold standard.
4. Archive the original.
5. Activate the replacement.

Recommended enforcement:

- UI hides direct content editing for active rows.
- Database trigger prevents updates to core content fields while `status = 'active'`.
- Allow limited active-row updates only for report counts and review metadata.

This gives rollback without a full revision-history system: the archived original remains available.

## Security Plan

Rules:

1. No direct public `SELECT` access to protected question tables.
2. Student-facing RPCs must filter `status = 'active'`.
3. Student-facing RPCs must name return columns explicitly. Never use `select *`.
4. Student-facing RPCs must return limited batches only.
5. Admin writes must require admin role checks.
6. No Supabase service-role key in frontend code.
7. Protected media uses private storage and signed URLs.
8. Production builds must not include protected local fallback banks.
9. Removing local fallback requires basic observability: log RPC failures and show a friendly unavailable state.

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

Add:

```text
/admin/question-lab
```

Keep the existing `/admin` analytics page separate.

Tabs for first build:

```text
Trainer Questions
Gold Standards
Review Queue
Reports
Coverage
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
- search stem/explanation

Actions:

- view
- create draft
- duplicate as draft
- review
- activate
- archive
- resolve reports

Active rows should show `Duplicate as draft` instead of direct edit.

### Gold Standards

Gold standards page should:

- show active rubric version
- allow creating a new version
- show good and bad examples
- show rejection rules
- mark related questions stale when a standard changes

Markdown files are only bootstrap material. The dashboard edits the database version.

### Review Queue

Shows:

- drafts awaiting review
- active questions marked `needs_review`
- questions with open reports
- questions affected by a gold-standard version change

Actions:

- mark pass
- mark needs review
- mark fail
- duplicate as draft
- archive

### CSV Export/Import Review Workflow

This is the low-cost bridge before paid automated review is worth it.

Purpose:

```text
Use the dashboard/database for storage.
Use ChatGPT/Claude subscription manually for bulk review.
Avoid paying per-question API costs until automation is clearly needed.
```

Workflow:

1. Filter questions in the dashboard.
2. Export selected draft/active questions as CSV.
3. Paste/upload the CSV into ChatGPT or Claude with the relevant gold-standard rubric.
4. Ask for review output in the same CSV format.
5. Re-upload the reviewed CSV.
6. Dashboard validates the rows and saves review results or suggested edits.
7. Admin approves any actual question changes.

Export columns:

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

Review import columns:

```text
id
review_status
review_summary
review_findings
suggested_stem
suggested_explanation
suggested_content_json
```

Import safety rules:

- imported reviews create rows in `question_reviews`
- imported suggested edits do not overwrite active questions
- suggested edits can create a new draft replacement
- active questions still follow duplicate-draft-archive-activate
- dashboard must validate `content_json` before accepting it

This makes manual ChatGPT/Claude review cheap and practical while keeping Supabase as the canonical store.

### Reports

Shows student reports from `question_reports`.

Minimum workflow:

```text
open -> reviewed -> dismissed
open -> reviewed -> fixed
```

If fixed, the fix should follow the active-question safety policy.

### Coverage

Shows counts by:

- source: trainer or UCAT bank
- section
- trainer type/question type
- skill tag
- difficulty
- status
- quality status

This helps decide where new questions are needed without relying on command-line scripts.

## Local Files And Sync Policy

Avoid daily two-way sync.

For protected authored content:

```text
Supabase is canonical.
Local snapshots are generated backups.
Humans do not edit snapshots.
```

For gold standards:

```text
Markdown files seed the database once.
After seeding, the database is canonical.
Do not manually maintain two sources of truth.
```

For procedural trainers:

```text
Git/local generator code is canonical.
Question Lab does not manage throwaway generated items.
```

Recommended generated snapshots:

```text
question-lab/snapshots/trainer_questions.snapshot.json
question-lab/snapshots/question_gold_standards.snapshot.json
```

Snapshots are useful for backup and review. They are not the editing interface.

## Minimal First Build

Build this first:

```text
Skills Trainer Question Lab v1
```

Includes:

1. `trainer_questions`
2. migration of current DM questions into `trainer_questions`
3. DM RPCs reading active rows from `trainer_questions`
4. `question_gold_standards` seeded from markdown files
5. `question_reviews`
6. `question_reports`
7. admin dashboard for trainer question browse/create/duplicate/review/activate/archive
8. CSV export/import for manual ChatGPT/Claude review
9. production DM local fallback disabled only after logging/unavailable-state handling exists

Then migrate SJT into the same `trainer_questions` table.

## Open Questions To Decide Before Implementation

| Question | Recommended default |
|---|---|
| Should skills trainer questions and UCAT mock questions share one table? | No. Use `trainer_questions` and `question_bank`. |
| Should DM/SJT stay in their old tables? | No long term. Migrate authored trainer questions into `trainer_questions`. |
| Should active questions be directly editable? | No. Duplicate as draft, archive original, activate replacement. |
| Should gold standards live in MD and DB forever? | No. MD seeds DB; DB becomes canonical. |
| Should procedural generators enter Question Lab? | No. Keep generator code local. |
| Should images be public? | No. Use private Supabase Storage and signed URLs. |
| Should full UCAT mocks use trainer questions? | No. Mocks use `question_bank` only. |

## Success Criteria

The first version is working when:

- Admin can manage DM trainer questions without command line.
- Current DM questions are served from `trainer_questions`.
- Students receive only active questions through named-column RPCs.
- Protected question banks are not bundled into production frontend JS.
- Active questions cannot be silently overwritten.
- Gold standards have one canonical database home after seeding.
- Student reports can flag bad questions.
- The same pattern can be extended to SJT and QR trainers.
- Future UCAT mini mocks have a clear separate schema path.
