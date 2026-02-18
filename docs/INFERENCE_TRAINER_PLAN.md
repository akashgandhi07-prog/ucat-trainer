# Inference Trainer — Robust Implementation Plan

**Goal:** Build an inference trainer that genuinely helps users improve their UCAT Verbal Reasoning by selecting evidence from passages. Questions must be high quality; the system must be robust and pedagogically effective.

---

## 1. Pedagogical Design — What Makes This Actually Helpful

### UCAT Alignment
- UCAT Verbal Reasoning tests *"making inferences and drawing conclusions from information"* — not just locating facts
- Inference questions are more time-consuming than True/False/Can't Tell
- Users need practice: *"Find the part of the text that supports this inference"* → builds the exact skill tested

### Learner-Focused Features
| Feature | Why it helps |
|---------|--------------|
| **Immediate feedback** | Show correct span highlighted after submit — users see exactly what they missed |
| **Explanation per question** | Store a 1–2 sentence *why* for each correct answer — teaches reasoning, not just marking |
| **Strategic tips** | Reuse `STRATEGIC_OBJECTIVES` pattern: "Look for the sentence that directly answers the question; avoid restatements." |
| **Question breakdown** | Like ResultsView: show question, user selection, correct selection, and explanation for each item |
| **Multiple valid spans** | Some inferences can be drawn from overlapping text; accept any span that reasonably answers |

---

## 2. Question Quality Standards

### Content Requirements (Per Question)
- **Single clear inference**: Question asks for one specific conclusion or implication
- **One primary correct span**: Ideally 1–3 sentences; avoid "the whole passage"
- **No trickery**: Answer must be inferable from the text, not guesswork
- **UCAT-like wording**: "Identify the part of the text from which we can infer…" / "Select the evidence that supports…"

### Quality Control Workflow
1. **Author** → Question + correct span(s) + explanation
2. **Validate** → Script checks: span is valid substring of passage; no passage edits since last validation
3. **Human review** → At least one person confirms question is fair and explanation is accurate
4. **Versioning** → Store `passageVersionHash` or `passageTextHash` with question; invalidate if passage changes

### Question Schema (Robust)
```ts
type InferenceQuestion = {
  id: string;
  passageId: string;
  questionText: string;
  /** Primary correct span(s) — character offsets; accept if user overlaps any sufficiently */
  correctSpans: { start: number; end: number }[];
  /** Optional: alternate valid spans (e.g. longer context) */
  alternateSpans?: { start: number; end: number }[];
  /** 1–2 sentence explanation shown after answer (right or wrong) */
  explanation: string;
  /** For robustness: sentence indices as fallback if passage text drifts */
  correctSentenceIndices?: number[];
  /** Hash of passage text at authoring time — invalidate question if passage changes */
  passageHash?: string;
  difficulty?: "easy" | "medium" | "hard";
};
```

---

## 3. Robust Selection & Comparison

### Selection Capture
- Use `Selection` + `Range` API; normalize to character offsets within the passage DOM node
- Handle edge cases: selection outside passage → ignore; empty selection → prompt user; multi-range → flatten to contiguous or support multiple spans
- Normalize whitespace: collapse runs of spaces; trim; compare on normalized text

### Answer Comparison (Layered)
1. **Overlap threshold**: User span overlaps any correct span by ≥70% (configurable) → correct
2. **Contains**: User selection fully contains correct span → correct (they highlighted more context)
3. **Alternate spans**: Check against `alternateSpans` if primary fails
4. **Near-miss feedback**: If overlap 50–70%, consider "Partial credit" or "Close — the key part is…" with explanation

### Span Robustness
- **Dual storage**: Store both character offsets AND sentence indices
- **Validation on load**: If `passageHash` doesn't match current passage, flag question for re-authoring
- **Fallback**: If character offsets fail (e.g. passage edited), use sentence-index matching as backup

---

## 4. Content Strategy — Using Existing Passages

### Phase 1: Curated Pilot (High Quality)
- Select 10–15 passages from existing 75 (mix of Ethics, History, Science; varied difficulty)
- Manually author **2–3 questions per passage** = 20–45 questions
- Each question: precise correct span, clear explanation
- Human review before shipping

### Phase 2: AI-Assisted Expansion
- Use LLM to propose questions + spans from remaining passages
- **Mandatory human review**: Edit/correct spans and explanations before inclusion
- Never auto-publish AI-generated questions without validation

### Phase 3: Community / Expert Curation (Future)
- Allow admins to add questions via UI with span picker
- Version history for questions; revert if quality drops

---

## 5. UI/UX Design — Beautiful & User-Centric

### Session Header Bar (Sticky)
Always visible during the drill, aligned with the screenshot and existing patterns:

| Element | Placement | Behavior |
|--------|-----------|----------|
| **End session** | Top-left | "× End session" — exits to results. Confirm modal: "End session? X questions unanswered. Your progress will be saved." [Cancel] [End session] |
| **Timer** | Top-right | Count-up (MM:SS) from session start; tabular-nums, turns red when >5 min |
| **Score** | Next to timer | "X/Y correct" or "X total score" + "You could earn Y points" |
| **Question indicator** | Optional | "Question 3 of 8" — clear progress |

Reuse patterns from `DrillActiveArea` (header with stats) and Rapid Recall (timer styling). Consistent `rounded-xl`, `border-slate-200`, `bg-slate-50` for header.

### Timer Behavior
- **Count-up** (elapsed time): More forgiving; users work at their pace; aligns with UCAT-style "complete in time" rather than hard cutoff
- Optional: **Countdown per question** (e.g. 90s) with **Skip** to move on — only if you want time pressure per question
- **Format**: `MM:SS` (e.g. `02:34`), tabular-nums, bold when <1 min left (if countdown)

### Skip & Finish
- **Skip question**: Moves to next without submitting; counts as incorrect; always available (like Calculator `onSkip`)
- **Finish**: Ends session early → goes to results; confirm if unanswered: "You have 3 unanswered questions. Finish anyway?"
- **Submit** (per question): Submits selection, shows feedback, then auto-advance or "Next" button
- Placement: Skip left or secondary; Finish prominent (primary CTA) — like `DrillActiveArea` footer

### Layout — Two Columns
- **Desktop**: Passage left (40–45%), Question panel right (55–60%); sticky header above both
- **Tablet/Mobile**: Stack vertically; passage first (scrollable), then question + Submit
- **Passage panel**: Scrollable, `user-select: text`, generous line-height (1.7), readable font (15–16px)
- **Question panel**: Instruction banner (blue/info), question text (bold), Submit button (full-width on mobile)
- **Visual hierarchy**: Clear separation; subtle border or background tint between columns

### Selection & Feedback Styling
- **User selection**: Native `::selection` or custom highlight (e.g. `bg-blue-100`)
- **Correct highlight** (after submit): `bg-emerald-100 border-l-4 border-emerald-500`
- **Incorrect highlight**: `bg-red-50 border-l-4 border-red-400` on user span; correct span in green
- **Smooth transition** when showing feedback (200ms fade)

### Results View (Full Flow)
- **Header**: "Inference Trainer — Results"
- **Stats cards** (3-column grid like ResultsView): Accuracy %, Score (X/Y), Total time
- **Save status**: "Saving…" / "Saved" / error — auto-save on completion
- **Question breakdown**: Expandable cards; each shows question, your selection, correct selection, explanation
- **Actions**: "Try another passage", "Back to Home", "View passage"
- **Logged**: `correct`, `total`, `time_seconds` in sessions table; Dashboard shows inference sessions

### Accessibility & Polish
- **Skip link**: "Skip to main content" (existing pattern)
- **Focus management**: After Submit, focus "Next" or results; trap focus in End-session confirm modal
- **ARIA**: `aria-live` for score updates; `role="region"` for passage and question
- **Loading states**: Skeleton or spinner when fetching passage/questions
- **Empty selection**: Inline error: "Please select part of the passage before submitting"

---

## 6. Per-Question Feedback (Detail)

### Per-Question Feedback (After Submit)
- **Correct**: Green highlight on user selection + brief "Correct — this sentence supports the inference because…"
- **Incorrect**: Red on user selection; green highlight on correct span; show explanation
- **Partial**: "Close — you selected part of it. The key evidence is…" + highlight correct span

### Results View (Inference-Specific)
- Reuse structure of `ResultsView` (speed, accuracy, breakdown)
- Replace WPM with "Time per question" or "Total time"
- Breakdown: Question text, your selection (excerpt), correct selection (excerpt), explanation
- "Why this matters" tip: "In UCAT VR, inference questions test whether you can identify evidence. Practice narrowing to the precise sentence."

---

## 7. Technical Architecture

### New Files
- `src/data/inferenceQuestions.ts` — Question set + types; exported `INFERENCE_QUESTIONS`
- `src/utils/inferenceComparison.ts` — Overlap logic, normalization, validation
- `src/components/inference/InferenceSessionHeader.tsx` — Sticky header: timer, score, End session (optional Skip/Finish)
- `src/components/inference/SelectablePassage.tsx` — Passage with selection capture
- `src/components/inference/InferenceQuiz.tsx` — Two-column layout, question + Submit + feedback
- `src/components/inference/InferenceResultsView.tsx` — Stats cards, breakdown, session save
- `src/pages/InferenceTrainerPage.tsx` — Full page flow (phases: active → results)

### Integration Points
- `TrainingType` + `SessionRow` + Supabase: add `inference_trainer`
- `SKILL_TEACHING` + `STRATEGIC_OBJECTIVES`: add inference trainer copy
- Landing page: add inference trainer card
- Dashboard: include inference sessions

### Validation Script (Optional but Recommended)
- `scripts/validateInferenceQuestions.ts` — Run in CI or pre-commit
- Checks: all spans valid substrings; passage hashes match; no duplicate IDs

---

## 8. Implementation Order

| Step | Task | Focus |
|------|------|-------|
| 1 | Question schema + types + 5 manually authored questions | Quality baseline |
| 2 | `SelectablePassage` + selection capture + normalization | Robust capture |
| 3 | `inferenceComparison.ts` — overlap, contains, alternates | Robust marking |
| 4 | **Session header bar** — timer (count-up), score, End session, Skip, Finish | UI/UX |
| 5 | `InferenceQuiz` — two-column layout, submit, per-question feedback | UX |
| 6 | `InferenceResultsView` — stats cards, breakdown, session save | Learning + logging |
| 7 | `InferenceTrainerPage` — flow, routing, session persistence | Integration |
| 8 | Expand to 20–30 questions (manual + reviewed AI) | Content |
| 9 | Validation script + accessibility polish | Maintainability |

### Completeness Checklist (Before Ship)
- [ ] Sticky session header with timer, score, End session
- [ ] Skip question and Finish session buttons; confirm on Finish with unanswered
- [ ] Scores logged to `sessions`; Dashboard shows inference sessions
- [ ] Results page shows accuracy, score, time; question breakdown with explanations
- [ ] Two-column layout; mobile stack; accessible (skip link, ARIA, focus)
- [ ] Empty selection handled (prompt before submit)

---

## 9. Success Criteria

- **Accuracy**: Comparison logic correctly accepts reasonable user selections (≥95% in manual QA)
- **Quality**: Every question has a clear correct answer and helpful explanation
- **Learning**: Users can see why they were wrong and improve on retries
- **Reliability**: Passage edits don't silently break questions; validation catches drift
