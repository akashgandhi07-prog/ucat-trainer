# UCAT Trainer — Project Summary for LLM Context

Paste this file (or its contents) into an LLM to give it accurate context about the codebase for continued development (e.g. adding the Inference Trainer, new drills, or bug fixes).

---

## Project overview

**UCAT Trainer** is a React + Vite + TypeScript + Tailwind + Supabase web app for UCAT exam prep. It covers **Verbal Reasoning** (speed reading, rapid recall, keyword scanning) and **Quantitative** (calculator trainer). Features include auth, sessions persisted to Supabase, and a dashboard with WPM/accuracy charts. Training types are `speed_reading`, `rapid_recall`, `keyword_scanning`, and `calculator`.

---

## Routing summary

| Path | Page / behaviour |
|------|-------------------|
| `/` | LandingPage — Verbal vs Calculator cards |
| `/verbal` | VerbalReasoningPage — hub for speed reading, rapid recall, keyword scanning |
| `/reader` | ReaderPage — speed reading drill |
| `/train/rapid-recall` | RapidRecallPage — rapid recall drill |
| `/train/keyword-scanning` | KeywordScanningPage — keyword scanning drill |
| `/train/calculator` | CalculatorPage — calculator trainer |
| `/dashboard` | Dashboard — sessions, charts, streaks |
| `/admin` | AdminPage — admin only |
| `/reset-password` | ResetPasswordPage — password reset |
| `/configure` | Redirects to `/` with search params preserved |

---

## Training types

- **Union**: `speed_reading` | `rapid_recall` | `keyword_scanning` | `calculator` | `inference_trainer`
- **Used in**: `src/types/session.ts` (`SessionRow`, `SessionInsertPayload`), `src/types/training.ts` (`TrainingType`, labels), Dashboard (fetch/display sessions), Verbal hub (links to each drill), Supabase `sessions.training_type` (see [docs/SESSIONS_SCHEMA.md](SESSIONS_SCHEMA.md)).

---

## File inventory (by area)

For each file: path and a one-line description. Omit `node_modules`, `dist`, and `.git`.

### Entry point and app shell

- [src/main.tsx](src/main.tsx) — React root, mounts `App`
- [src/App.tsx](src/App.tsx) — Router, providers (Auth, Toast, AuthModal, BugReport), route definitions for `/`, `/verbal`, `/reader`, `/train/calculator`, `/train/rapid-recall`, `/train/keyword-scanning`, `/dashboard`, `/admin`, `/reset-password`
- [src/App.css](src/App.css), [src/index.css](src/index.css) — Global styles

### Types

- [src/types/session.ts](src/types/session.ts) — `UserSession`, `AuthState`, `SessionRow`, `SessionInsertPayload`; training_type union
- [src/types/training.ts](src/types/training.ts) — `TrainingType`, `TrainingDifficulty`, `TRAINING_TYPE_LABELS`, `TRAINING_DIFFICULTY_LABELS`

### Pages

- [src/pages/LandingPage.tsx](src/pages/LandingPage.tsx) — Home: Verbal vs Calculator cards, SEO
- [src/pages/VerbalReasoningPage.tsx](src/pages/VerbalReasoningPage.tsx) — Hub for speed reading, rapid recall, keyword scanning; passage picker, WPM/difficulty presets, links to Reader / RapidRecall / KeywordScanning
- [src/pages/ReaderPage.tsx](src/pages/ReaderPage.tsx) — Speed reading: passage + timer, WPM target, True/False/Can't Tell; saves to sessions
- [src/pages/RapidRecallPage.tsx](src/pages/RapidRecallPage.tsx) — Rapid recall: read for time then answer from memory; uses `DistortionQuiz`
- [src/pages/KeywordScanningPage.tsx](src/pages/KeywordScanningPage.tsx) — Keyword scanning: find target words in passage
- [src/pages/CalculatorPage.tsx](src/pages/CalculatorPage.tsx) — Calculator trainer: mode picker (Sprint, Finger Twister, Memory, Stages, Free), drills, analytics; uses calculator components below
- [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) — User dashboard: fetches sessions from Supabase, charts (WPM, accuracy), guest merge, streaks, target WPM
- [src/pages/AdminPage.tsx](src/pages/AdminPage.tsx) — Admin-only page
- [src/pages/ResetPasswordPage.tsx](src/pages/ResetPasswordPage.tsx) — Password reset flow

### Calculator trainer (components + logic)

- [src/components/calculator/CalculatorEngine.tsx](src/components/calculator/CalculatorEngine.tsx) — Renders numpad, display, drill flow
- [src/components/calculator/useCalculatorLogic.ts](src/components/calculator/useCalculatorLogic.ts) — Calculator state machine: question generation, input, submit, skip, completion
- [src/components/calculator/calculatorStages.ts](src/components/calculator/calculatorStages.ts) — Stage definitions (1–5), difficulty, question count, required accuracy; localStorage for highest unlocked stage
- [src/components/calculator/DrillModes.tsx](src/components/calculator/DrillModes.tsx) — UI to pick drill mode (sprint, fingerTwister, memory, stages, free)
- [src/components/calculator/DrillActiveArea.tsx](src/components/calculator/DrillActiveArea.tsx) — Active drill UI (header, timer, skip/finish)
- [src/components/calculator/DrillSummary.tsx](src/components/calculator/DrillSummary.tsx) — Post-drill summary
- [src/components/calculator/KeyHeatmap.tsx](src/components/calculator/KeyHeatmap.tsx) — Keypress heatmap for analytics
- [src/components/calculator/AnalyticsDashboard.tsx](src/components/calculator/AnalyticsDashboard.tsx) — Calculator stats (KPS, accuracy, history)
- [src/components/calculator/ShortcutsModal.tsx](src/components/calculator/ShortcutsModal.tsx) — Keyboard shortcuts modal
- [src/components/calculator/calculator.css](src/components/calculator/calculator.css) — Calculator-specific styles
- [src/utils/analyticsStorage.ts](src/utils/analyticsStorage.ts) — Save/load calculator sessions; writes to Supabase `sessions` (training_type: calculator, wpm = KPS, difficulty = mode)

### Verbal: reader and quiz

- [src/components/reader/ReaderEngine.tsx](src/components/reader/ReaderEngine.tsx) — Speed-reading passage view, timer, finish/pause, WPM
- [src/components/quiz/DistortionQuiz.tsx](src/components/quiz/DistortionQuiz.tsx) — Quiz UI (e.g. True/False/Can't Tell, rapid recall answers)
- [src/components/quiz/ResultsView.tsx](src/components/quiz/ResultsView.tsx) — Results: score, WPM, breakdown; used by reader/rapid recall
- [src/components/quiz/ReReadPassageModal.tsx](src/components/quiz/ReReadPassageModal.tsx) — Modal to re-read passage

### Data

- [src/data/passages.ts](src/data/passages.ts) — `Passage` type, `RAW_PASSAGES`, `PASSAGES` (with difficulty); used by reader, rapid recall, keyword scanning
- [src/data/teaching.ts](src/data/teaching.ts) — `SKILL_TEACHING`, `WHY_UCAT_READING` per TrainingType (speed_reading, rapid_recall, keyword_scanning, calculator)
- [src/data/tips.ts](src/data/tips.ts) — `TIPS` per mode, `getTipForMode()`

### Auth and profile

- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) — Auth state, sign in/out, profile, session load retry
- [src/contexts/AuthModalContext.tsx](src/contexts/AuthModalContext.tsx) — Open/close auth modal
- [src/components/auth/AuthModal.tsx](src/components/auth/AuthModal.tsx) — Sign in / sign up UI
- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) — Hook to consume AuthContext
- [src/lib/profileApi.ts](src/lib/profileApi.ts) — Fetch/update profile
- [src/lib/supabase.ts](src/lib/supabase.ts) — Supabase client
- [src/lib/passwordValidation.ts](src/lib/passwordValidation.ts) — Password rules
- [src/lib/guestSessions.ts](src/lib/guestSessions.ts) — Merge guest sessions into user after login

### Layout and shared UI

- [src/components/layout/Header.tsx](src/components/layout/Header.tsx) — Nav, auth, bug report
- [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) — Footer
- [src/components/seo/SEOHead.tsx](src/components/seo/SEOHead.tsx) — Title, meta, canonical, OG
- [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) — Error boundary
- [src/components/bug/BugReportModal.tsx](src/components/bug/BugReportModal.tsx) — Bug report form
- [src/contexts/BugReportContext.tsx](src/contexts/BugReportContext.tsx), [src/contexts/ToastContext.tsx](src/contexts/ToastContext.tsx) — Bug report and toasts

### Lib and utils

- [src/lib/logger.ts](src/lib/logger.ts) — Logging helpers
- [src/lib/retry.ts](src/lib/retry.ts) — Retry logic
- [src/lib/siteUrl.ts](src/lib/siteUrl.ts) — Base URL for SEO/links
- [src/lib/wpmBenchmark.ts](src/lib/wpmBenchmark.ts) — WPM tiers and comparison copy
- [src/lib/streakUtils.ts](src/lib/streakUtils.ts) — Streak calculation
- [src/lib/guidedChunkingPreferences.ts](src/lib/guidedChunkingPreferences.ts) — Chunking prefs for reader
- [src/lib/passages.ts](src/lib/passages.ts) — Passage picking helpers (e.g. `pickNewRandomPassage`)
- [src/utils/xpSystem.ts](src/utils/xpSystem.ts) — XP (if used)
- [src/utils/textAnalysis.ts](src/utils/textAnalysis.ts) — Text utilities
- [src/hooks/useIsMobile.ts](src/hooks/useIsMobile.ts) — Mobile detection

### Supabase and schema

- [supabase/full-schema-setup.sql](../supabase/full-schema-setup.sql) — Full schema: profiles, sessions (including calculator and inference_trainer), bug_reports, RLS
- [supabase/migrations/007_sessions_add_calculator_type.sql](../supabase/migrations/007_sessions_add_calculator_type.sql) — Legacy migration: added `calculator` to sessions.training_type check (superseded by full schema)
- [supabase/migrations/008_sessions_add_inference_trainer_type.sql](../supabase/migrations/008_sessions_add_inference_trainer_type.sql) — Legacy migration: added `inference_trainer` to sessions.training_type check (superseded by full schema)
- [docs/SESSIONS_SCHEMA.md](SESSIONS_SCHEMA.md) — Sessions table columns and RLS (training_type: speed_reading, rapid_recall, keyword_scanning, calculator, inference_trainer)

### Inference Trainer

- [docs/INFERENCE_TRAINER_PLAN.md](INFERENCE_TRAINER_PLAN.md) — Detailed plan for Inference Trainer: question schema, selection capture, comparison logic, UI (two-column, sticky header, timer, results), new files to add, integration with sessions/Dashboard
- [src/pages/InferenceTrainerPage.tsx](src/pages/InferenceTrainerPage.tsx) and `src/components/inference/*` — Implemented Inference Trainer page and components; logs sessions with `training_type = "inference_trainer"` into `sessions` with `difficulty`, `correct`, `total`, and `time_seconds`.
