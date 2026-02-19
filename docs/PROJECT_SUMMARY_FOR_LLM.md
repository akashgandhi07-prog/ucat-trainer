# UCAT Trainer — Project Summary for LLM Context

Paste this file (or its contents) into an LLM to give it accurate context about the codebase for continued development (e.g. adding new trainers, SEO tweaks, or bug fixes).

---

## Project overview

**UCAT Trainer** is a React + Vite + TypeScript + Tailwind + Supabase web app for UCAT exam prep. It currently implements:

- **Verbal Reasoning**: speed reading, rapid recall, keyword scanning, and an inference trainer.
- **Decision Making**: syllogism micro drills (single conclusion per question) and macro drills (blocks of 5 conclusions per stimulus, standard UCAT layout).
- **Quantitative Reasoning**: an on-screen calculator trainer and a staged mental maths trainer.

Features include Supabase auth, persisted training sessions (where applicable), a dashboard with charts/streaks, SEO-focused landing pages per subsection, bug reporting, and light analytics.

---

## Routing summary (high level)

### Primary SEO routes

These are the main, keyword-rich URLs exposed to users (see `src/App.tsx`):

| Path | Page / behaviour |
|------|-------------------|
| `/` | `LandingPage` — high-level hub linking to verbal / quant sections |
| `/ucat-verbal-reasoning-practice` | `VerbalReasoningPage` — verbal hub for speed reading, rapid recall, keyword scanning, inference trainer |
| `/ucat-quantitative-reasoning-practice` | `QuantitativeReasoningPage` — quant hub for calculator and mental maths trainers |
| `/ucat-verbal-reasoning-speed-reading-trainer` | `ReaderPage` — speed reading drill |
| `/ucat-rapid-recall-trainer` | `RapidRecallPage` — rapid recall drill |
| `/ucat-keyword-scanning-trainer` | `KeywordScanningPage` — keyword scanning drill |
| `/ucat-inference-trainer` | `InferenceTrainerPage` — inference trainer |
| `/ucat-decision-making-practice` | `DecisionMakingPage` — Decision Making hub for syllogism trainers |
| `/ucat-mental-maths-trainer` | `MentalMathsPage` — mental maths trainer |
| `/ucat-syllogism-practice-macro-drills` | `SyllogismMacroPage` — macro syllogism drill |
| `/train/calculator` | `CalculatorPage` — calculator trainer (URL left as-is) |
| `/train/syllogism/micro` | `SyllogismMicroPage` — micro syllogism drill |
| `/dashboard` | `Dashboard` — sessions, charts, streaks |
| `/admin` | `AdminPage` — admin only |
| `/reset-password` | `ResetPasswordPage` — password reset |
| `/configure` | `ConfigureRedirect` — redirects to `/` while preserving search params |

### Legacy paths (301-style redirects)

The app keeps older, shorter paths for backwards compatibility and SEO, but they redirect immediately to the keyword-rich URLs:

- `/verbal` → `/ucat-verbal-reasoning-practice`
- `/quantitative` → `/ucat-quantitative-reasoning-practice`
- `/reader` → `/ucat-verbal-reasoning-speed-reading-trainer`
- `/train/rapid-recall` → `/ucat-rapid-recall-trainer`
- `/train/keyword-scanning` → `/ucat-keyword-scanning-trainer`
- `/train/inference` → `/ucat-inference-trainer`
- `/decision-making` → `/ucat-decision-making-practice`
- `/train/mentalMaths` → `/ucat-mental-maths-trainer`
- `/train/syllogism/macro` → `/ucat-syllogism-practice-macro-drills`

---

## Training types and sessions

- **Union in TypeScript** (`src/types/training.ts`):  
  `TrainingType = "speed_reading" | "rapid_recall" | "keyword_scanning" | "calculator" | "inference_trainer" | "mental_maths"`.
- **Sessions table** (`docs/SESSIONS_SCHEMA.md`, `supabase/full-schema-setup.sql`):  
  - `training_type` is stored as text; the SQL schema is the source of truth for allowed values.  
  - `speed_reading`, `rapid_recall`, `keyword_scanning`, `calculator`, `inference_trainer`, and `mental_maths` all write to `public.sessions` with appropriate `difficulty`, `correct`, `total`, `time_seconds`, and (where applicable) `wpm`.  
  - Mental maths sessions store accuracy and average time per question in app logic and persist a summary row into `sessions` (with `difficulty` set to the stage label, `time_seconds` derived from average time × question count).
- **Usage**:
  - `src/types/session.ts`: `SessionRow`, `SessionInsertPayload` shape mirrors the `sessions` table.
  - Dashboard reads from `sessions` to render WPM/accuracy charts, streaks, and target benchmarks.
  - Guest sessions are buffered client-side and merged after login (`src/lib/guestSessions.ts`).

Note: syllogism trainers currently use their own Supabase tables / logic (`public.syllogism_questions`, `public.syllogism_sessions`, `useSyllogismLogic`) rather than the generic `sessions` table.

---

## File inventory (by area)

For each file: path and a one-line description. Omit `node_modules`, `dist`, and `.git`.

### Entry point and app shell

- [src/main.tsx](src/main.tsx) — React root, mounts `App`.
- [src/App.tsx](src/App.tsx) — Router + providers (Auth, Toast, AuthModal, BugReport, analytics) and all route definitions including SEO URLs and legacy redirects.
- [src/index.css](src/index.css), [src/App.css](src/App.css if present) — Global styles and Tailwind layer overrides.

### Types

- [src/types/session.ts](src/types/session.ts) — `UserSession`, `AuthState`, `SessionRow`, `SessionInsertPayload`; mirrors Supabase `sessions`.
- [src/types/training.ts](src/types/training.ts) — `TrainingType`, `TrainingDifficulty`, `TRAINING_TYPE_LABELS`, `TRAINING_DIFFICULTY_LABELS` (includes `mental_maths`).
- [src/types/inference.ts](src/types/inference.ts) — Types for inference questions, answers, and results.

### Pages (user-facing)

- [src/pages/LandingPage.tsx](src/pages/LandingPage.tsx) — Home: cards for Verbal vs Quantitative hubs, SEO copy.
- [src/pages/VerbalReasoningPage.tsx](src/pages/VerbalReasoningPage.tsx) — Verbal hub for speed reading, rapid recall, keyword scanning, inference; passage picker, WPM/difficulty presets, deep links into drills.
- [src/pages/ReaderPage.tsx](src/pages/ReaderPage.tsx) — Speed reading drill: passage + timer, WPM target, T/F/CT questions; saves sessions.
- [src/pages/RapidRecallPage.tsx](src/pages/RapidRecallPage.tsx) — Rapid recall: timed reading, then answer-from-memory quiz via `DistortionQuiz`.
- [src/pages/KeywordScanningPage.tsx](src/pages/KeywordScanningPage.tsx) — Keyword scanning: search for target words in a passage under time pressure.
- [src/pages/InferenceTrainerPage.tsx](src/pages/InferenceTrainerPage.tsx) — Inference trainer UI wired to inference data and session logging.
- [src/pages/CalculatorPage.tsx](src/pages/CalculatorPage.tsx) — Calculator trainer: mode picker (Sprint, Finger Twister, Memory, Stages, Free), drills, analytics.
- [src/pages/QuantitativeReasoningPage.tsx](src/pages/QuantitativeReasoningPage.tsx) — Quant hub: routes into calculator trainer and mental maths trainer.
- [src/pages/MentalMathsPage.tsx](src/pages/MentalMathsPage.tsx) — Mental maths trainer page: wraps `MentalMathsEngine`, teaching copy, and session logging.
- [src/pages/DecisionMakingPage.tsx](src/pages/DecisionMakingPage.tsx) — Decision Making hub: explains syllogism drills; links to micro/macro drills and shows FAQs.
- [src/pages/SyllogismMacroPage.tsx](src/pages/SyllogismMacroPage.tsx) — Macro syllogism drill page: UCAT-style block with one stimulus and exactly 5 conclusions.
- [src/pages/SyllogismMicroPage.tsx](src/pages/SyllogismMicroPage.tsx) — Micro syllogism drill page (single-premise, single-conclusion items for pattern recognition).
- [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) — User dashboard: fetches Supabase sessions, shows charts (WPM, accuracy, training history), streaks, target WPM, and guest merge prompts.
- [src/pages/AdminPage.tsx](src/pages/AdminPage.tsx) — Admin-only page for internal tools (e.g. content management / debug).
- [src/pages/ResetPasswordPage.tsx](src/pages/ResetPasswordPage.tsx) — Password reset flow via Supabase magic link / token.

### Calculator trainer (components + logic)

- [src/components/calculator/CalculatorEngine.tsx](src/components/calculator/CalculatorEngine.tsx) — Renders numpad, display, drill flow shell.
- [src/components/calculator/useCalculatorLogic.ts](src/components/calculator/useCalculatorLogic.ts) — Calculator state machine: question generation, input handling, submit/skip, completion summary.
- [src/components/calculator/calculatorStages.ts](src/components/calculator/calculatorStages.ts) — Stage definitions (1–5): difficulty, question count, required accuracy, max time; persists highest unlocked stage in `localStorage`.
- [src/components/calculator/DrillModes.tsx](src/components/calculator/DrillModes.tsx) — UI to pick drill mode (sprint, fingerTwister, memory, stages, free) and start a drill.
- [src/components/calculator/DrillActiveArea.tsx](src/components/calculator/DrillActiveArea.tsx) — Active drill UI (header, timer, progress, skip/finish controls).
- [src/components/calculator/DrillSummary.tsx](src/components/calculator/DrillSummary.tsx) — Post-drill summary including accuracy and speed metrics.
- [src/components/calculator/KeyHeatmap.tsx](src/components/calculator/KeyHeatmap.tsx) — Keypress heatmap for analytics and reviewing weak keys.
- [src/components/calculator/AnalyticsDashboard.tsx](src/components/calculator/AnalyticsDashboard.tsx) — Calculator stats (KPS, history, charts).
- [src/components/calculator/ShortcutsModal.tsx](src/components/calculator/ShortcutsModal.tsx) — Keyboard shortcuts help modal.
- [src/components/calculator/calculator.css](src/components/calculator/calculator.css) — Calculator-specific styles.
- [src/utils/analyticsStorage.ts](src/utils/analyticsStorage.ts) — Save/load calculator and mental maths sessions; writes to Supabase `sessions` (e.g. `training_type = "calculator"` or `"mental_maths"`).

### Verbal: reader and quiz

- [src/components/reader/ReaderEngine.tsx](src/components/reader/ReaderEngine.tsx) — Speed-reading passage view, timer controls, finish/pause, WPM calculations and session logging hooks.
- [src/components/quiz/DistortionQuiz.tsx](src/components/quiz/DistortionQuiz.tsx) — Quiz UI (True/False/Can’t Tell, recall questions) used by both reader and rapid recall flows.
- [src/components/quiz/ResultsView.tsx](src/components/quiz/ResultsView.tsx) — Unified results view: score, WPM, breakdown; used by reader/rapid recall.
- [src/components/quiz/ReReadPassageModal.tsx](src/components/quiz/ReReadPassageModal.tsx) — Modal to re-read the passage after a drill for learning, not grading.

### Decision Making & syllogisms

- [src/components/syllogisms/MacroDrill.tsx](src/components/syllogisms/MacroDrill.tsx) — Full UCAT-style macro syllogism drill: one stimulus with 5 conclusions, Yes/No per conclusion, drag-and-drop (desktop) + tap (mobile), feedback and UCAT macro scoring (2 marks for 5/5, 1 mark for 4/5, otherwise 0).
- [src/components/syllogisms/MicroDrill.tsx](src/components/syllogisms/MicroDrill.tsx) — Micro syllogism drill: short one-premise/one-conclusion questions with keyboard shortcuts for fast pattern recognition; tracks per-logic-group accuracy.
- `src/components/syllogisms/useSyllogismLogic.ts` — Hook handling syllogism state, fetching questions from Supabase, timing, scoring, and saving `syllogism_sessions` (micro and macro).

### Mental maths trainer

- [src/components/mentalMaths/MentalMathsEngine.tsx](src/components/mentalMaths/MentalMathsEngine.tsx) — Core mental maths trainer UI and state; manages stages, numeric input, MCQ questions, review, and summary.
- `src/components/mentalMaths/mentalMathsStages.ts` — Stage config: per-stage targets (accuracy %, max avg time per question) and unlock criteria.
- `src/hooks/useMentalMathsLogic.ts` — Logic hook powering `MentalMathsEngine` (question generation, timing, thresholds, summary stats).

### Inference Trainer

- [docs/INFERENCE_TRAINER_PLAN.md](INFERENCE_TRAINER_PLAN.md) — Detailed plan for Inference Trainer: question schema, selection capture, comparison logic, two-column UI, timer, results, Supabase integration.
- [src/pages/InferenceTrainerPage.tsx](src/pages/InferenceTrainerPage.tsx) and `src/components/inference/*` — Implemented inference trainer page and components; logs sessions with `training_type = "inference_trainer"` and fields like `difficulty`, `correct`, `total`, `time_seconds`.
- [src/data/inferenceQuestions.ts](src/data/inferenceQuestions.ts) — Inference question bank (groups, stems, answer options, explanations).

### Data

- [src/data/passages.ts](src/data/passages.ts) — `Passage` type, `RAW_PASSAGES`, `PASSAGES` (with difficulty); used by reader, rapid recall, keyword scanning.
- [src/data/teaching.ts](src/data/teaching.ts) — `SKILL_TEACHING`, `WHY_UCAT_READING` per `TrainingType` (speed_reading, rapid_recall, keyword_scanning, calculator, mental_maths).
- [src/data/tips.ts](src/data/tips.ts) — `TIPS` per mode, `getTipForMode()` for drill-specific hints.
- [src/data/trainerFaqs.ts](src/data/trainerFaqs.ts) — Structured FAQs for hubs/trainers (verbal, quant, Decision Making, mental maths, syllogisms) consumed by `TrainerFaqSection`.

### Auth and profile

- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) — Auth state, sign in/out, profile loading, and session load retry.
- [src/contexts/AuthModalContext.tsx](src/contexts/AuthModalContext.tsx) — Open/close auth modal across the app.
- [src/components/auth/AuthModal.tsx](src/components/auth/AuthModal.tsx) — Sign in / sign up UI integrated with Supabase.
- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) — Hook to consume auth state.
- [src/lib/profileApi.ts](src/lib/profileApi.ts) — Fetch/update user profile via Supabase.
- [src/lib/supabase.ts](src/lib/supabase.ts) — Supabase client factory.
- [src/lib/passwordValidation.ts](src/lib/passwordValidation.ts) — Password rules and validation helpers.
- [src/lib/guestSessions.ts](src/lib/guestSessions.ts) — Buffer guest sessions locally and merge into Supabase after login.

### Layout, SEO, and shared UI

- [src/components/layout/Header.tsx](src/components/layout/Header.tsx) — Top nav, auth controls, bug report entry point.
- [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) — Footer with links/attribution.
- [src/components/layout/TutoringUpsell.tsx](src/components/layout/TutoringUpsell.tsx) — Reusable upsell block for tutoring, shown on hubs.
- [src/components/seo/SEOHead.tsx](src/components/seo/SEOHead.tsx) — SEO meta, canonical tags, OG tags, structured breadcrumbs.
- [src/components/seo/TrainerFaqSection.tsx](src/components/seo/TrainerFaqSection.tsx) — Renders FAQ accordions + schema.org FAQ markup for SEO using `trainerFaqs`.
- [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) — React error boundary.
- [src/components/bug/BugReportModal.tsx](src/components/bug/BugReportModal.tsx) — Bug report form that posts into Supabase `bug_reports`.
- [src/contexts/BugReportContext.tsx](src/contexts/BugReportContext.tsx), [src/contexts/ToastContext.tsx](src/contexts/ToastContext.tsx) — Contexts for bug reporting and toast notifications.
- [src/components/analytics/PageViewTracker.tsx](src/components/analytics/PageViewTracker.tsx) — Listens to route changes and sends analytics events.

### Lib and utils

- [src/lib/logger.ts](src/lib/logger.ts) — Logging helpers (production-safe).
- [src/lib/retry.ts](src/lib/retry.ts) — Small retry helper for Supabase/network calls.
- [src/lib/siteUrl.ts](src/lib/siteUrl.ts) — Base URL helper for SEO canonicals + breadcrumbs.
- [src/lib/wpmBenchmark.ts](src/lib/wpmBenchmark.ts) — WPM tiers and comparisons for dashboard copy.
- [src/lib/streakUtils.ts](src/lib/streakUtils.ts) — Streak calculation for dashboard.
- [src/lib/guidedChunkingPreferences.ts](src/lib/guidedChunkingPreferences.ts) — User preferences for guided chunking in the reader.
- [src/lib/passages.ts](src/lib/passages.ts) — Passage picking helpers (e.g. `pickNewRandomPassage`).
- [src/lib/tutoringUpsell.ts](src/lib/tutoringUpsell.ts) — Copy/config for tutoring upsell component.
- [src/lib/analytics.ts](src/lib/analytics.ts) — `trackEvent`, `setActiveTrainer`, `clearActiveTrainer` wrappers for analytics.
- [src/utils/xpSystem.ts](src/utils/xpSystem.ts) — XP / progression system (if enabled).
- [src/utils/textAnalysis.ts](src/utils/textAnalysis.ts) — Text utilities used by verbal trainers.
- [src/hooks/useIsMobile.ts](src/hooks/useIsMobile.ts) — Mobile detection hook.

### Supabase and schema

- [supabase/full-schema-setup.sql](../supabase/full-schema-setup.sql) — Full schema: `profiles`, `sessions` (including calculator, inference_trainer, mental_maths etc.), `bug_reports`, RLS policies.
- [supabase/migrations/007_sessions_add_calculator_type.sql](../supabase/migrations/007_sessions_add_calculator_type.sql) — Legacy migration: added `calculator` to `sessions.training_type` check (superseded by full schema).
- [supabase/migrations/008_sessions_add_inference_trainer_type.sql](../supabase/migrations/008_sessions_add_inference_trainer_type.sql) — Legacy migration: added `inference_trainer` to `sessions.training_type` check (superseded by full schema).
- [docs/SESSIONS_SCHEMA.md](SESSIONS_SCHEMA.md) — Human-readable schema for `sessions` table and RLS; refer to `full-schema-setup.sql` for the latest enum/constraint values.
- [docs/SUPABASE_RLS.md](SUPABASE_RLS.md) — RLS policy notes and rationale.

---

This summary is intended as a **high-signal map** for LLMs working on this codebase: if adding a new trainer, extend `TrainingType`, wire it into Supabase sessions (if appropriate), surface it via a hub page (verbal/quant/Decision Making), and ensure SEO routes, FAQs, and analytics are updated consistently.
