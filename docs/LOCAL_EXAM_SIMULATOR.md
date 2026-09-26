# TheUKCATPeople Mock Exam (local simulator)

Run `npm run dev -- --host 127.0.0.1 --port 5187` and open http://127.0.0.1:5187/exam-simulator.html.

Tutor question database: http://127.0.0.1:5187/question-database.html.

This is a separate Vite HTML entry. The main app does not import or link it, and the default production build does not include it. Nothing has been deployed. Do not add it to the production build inputs until publication is explicitly approved.

## Included

- A full-length 184-question template (VR 44, DM 35, QR 36, SJT 69) using the published section counts and timings, plus an eight-question interaction demo. The questions are placeholders.
- Split VR/SJT and full-width DM/QR layouts, modelled on the style of the real test.
- Single-choice, five-statement Yes/No, and most/least appropriate answers.
- Drag-and-drop tiles and keyboard-accessible select-tile/select-slot alternative.
- Section instructions, timed/untimed modes, 25% extra time, automatic timeout transitions.
- In-progress attempts are saved to `localStorage` and recoverable after a reload or restart in the same browser; signed-in users also sync to their account. If a timed section expires while the student is away, resuming shows a notice before moving on.
- Navigator, flags, review filters, section-end confirmation and response export.
- Calculator (artwork in `calculator.svg`, see the provenance note under "Before going live") with arithmetic, memory and keyboard input; draggable dialogs.
- Seven colour choices including the default theme.
- Keyboard controls modelled on the real test: hold Alt on Windows or Option on macOS,
  then use N (Next), P (Previous), F (Flag), V (Navigator), C (Calculator),
  or H (Help). Escape closes dialogs.

## Tutor question database

The database is a local authoring workspace for the simulator format. It
supports all three simulator question types, correct answers, explanations,
editorial status, difficulty, tags, authors, reviewers, review notes, optional
tables, student previews, search, filters, duplication, validation,
section/review reports, JSON import/export, and CSV reporting.

Edits autosave to browser local storage. Export the JSON bank for a durable
backup or to import it into the simulator. Approved questions must have a
complete correct answer and an explanation. Keyboard shortcuts do not fire
while a tutor is typing in a form field.

## Load questions

Choose the full-length shell or short interaction demo, then download the current bank JSON on the setup screen. Edit it and choose **Load question JSON**. `src/exam-simulator/model.ts` defines validation; `sample.ts` contains a compact example and `fullShell.ts` creates the full template. Import occurs entirely in the browser with no server upload.

The setup screen also downloads `ucat-question-bank.schema.json`, a JSON Schema suitable for editors and validation tools. The runtime adds checks that JSON Schema cannot conveniently express here: section IDs, question IDs and option IDs must be unique, and every table row must contain the same number of cells as its header.

Each bank has a title and 1 to 4 sections. Sections use unique IDs VR, DM, QR or SJT, a name, durationSeconds, instructionSeconds (defaults to 90), and questions. Question IDs must be unique across the bank.

Questions use type `choice`, `yes-no` or `most-least`; `prompt` is required. Optional `passage` supports plain text and paragraph breaks. `layout` is `full` or `split`. Choice and most/least questions require options with unique IDs and text. Yes/no questions require five statements. Tables use headers and rows. Images accept embedded PNG/JPEG/WebP data URLs. Remote URLs and HTML are not accepted. Import maximum: 10 MB.

Responses export as question-ID-to-answer maps, alongside flags and visited question IDs. Choice responses use `choice`; Yes/No responses use string keys `0` to `4`; most/least responses use `most` and `least` option IDs. These formats permit later scoring without changing the exam renderer. Active attempts are saved to `localStorage` (the 30 most recent attempts are kept; older ones and their snapshots are deleted, and completed attempts are pruned first if storage is full). Guest attempts stay on the device. For signed-in users the attempt, including the bank, is also saved to the `exam_attempts` table, debounced to one save every few seconds after an answer, flag, section or phase change. Attempts saved by a signed-in user are removed from the device when they sign out.

## Prototype limits

This is a functional first version modelled on the style of the real test, not a replica of it. All names, headings and instruction text are TheUKCATPeople's own wording (the mock is titled "TheUKCATPeople Mock"; timing columns read "Standard time" and "Extended time (25% extra)"). Calculator state resets when closed. Recalled memory, percentage and sign-change results behave as fresh entries, so the next digit starts a new number. Repeated-equals and percentage behaviour are not yet checked against a standard exam calculator. Official scoring is not implemented. Draft recovery is per browser for guests; export at completion for a durable record. Imported question text is plain text, not rich HTML. Desktop layout is the fidelity target.

The layout and interactions are modelled on the style of the real test. No official question text or instruction text is included, and no external exam endpoints or analytics scripts are used. The provenance of the calculator artwork is not recorded, so treat it as unconfirmed until reviewed.

## Access gate

Both entries are wrapped in `src/exam-simulator/AccessGate.tsx` (rules in `gateRules.ts`, tested by `scripts/verify-exam-simulator.ts`).

- Flag unset (default, local use): both pages are open, as before.
- `VITE_EXAM_SIMULATOR_REQUIRE_AUTH=true`: a loading state shows while the Supabase session resolves. The mock exam then needs any signed-in account; the question database needs `profiles.role = 'admin'` or `profiles.planner_role = 'tutor'` (the same role model as the main app, see `docs/ACCESS_RLS_MATRIX.md`). Signed-out users see a sign-in prompt instead of the page.
- The main app has no `/login` route or redirect parameter: sign-in is a modal opened from its header. The prompt therefore opens the main app (`/`) in a new tab. The session is shared through `localStorage` on the same origin, so the gate re-checks when the student returns to the tab (focus and visibility change) or selects "I have signed in". A true redirect back would need a `?signin=1&next=` handler added to the main app.
- This is a UX gate, not a security boundary. The gate runs in the browser, and everything bundled into the page (including `fullShell.ts`, `sample.ts` and any correct answers and explanations) can be read by anyone who downloads the JavaScript, signed in or not. Real question banks and answer keys must be loaded from the server under RLS (or an edge function that checks the role) after sign-in, never bundled.

## Before going live

- [ ] Replace the placeholder full-length bank with real questions, loaded from the server after sign-in (Supabase table under RLS or an edge function), not bundled into the JavaScript. Remove answer keys from the client bundle; the question database must also read and write the server copy rather than `localStorage`.
- [ ] Any new `public` table gets explicit grants in its migration (`grant select, insert, update, delete on public.<table> to service_role;` plus `authenticated` only where RLS allows it), and passes `scripts/check-migration-grants.mjs`.
- [ ] Set `VITE_EXAM_SIMULATOR_REQUIRE_AUTH=true` in the Vercel production environment and confirm the signed-out, student and tutor/admin paths on a preview deploy.
- [ ] Optional: add a sign-in redirect (`?signin=1&next=`) to the main app so the prompt returns students here automatically.
- [ ] Add `exam-simulator.html` (and `question-database.html` if tutors need it hosted) to the build inputs in `vite.config.ts` and add matching routes or rewrites in `vercel.json`; check the CSP allows the page.
- [ ] Replace `src/exam-simulator/calculator.svg` with artwork drawn in house unless its source and licence are confirmed (it arrived as "supplied" artwork with no recorded origin).
- [ ] Legal and branding review: TheUKCATPeople naming throughout, no official logos, wording, artwork or question content (including the calculator artwork and colour scheme labels), and a clear statement that this is an independent practice mock not affiliated with the test provider.
- [ ] Remove the "Local development · unpublished" footer and the `noindex` meta only once the above is done (keep `noindex` on the question database).

## Verification

- `npx tsc -b --noEmit`
- `npx eslint src/exam-simulator src/question-database scripts/verify-exam-simulator.ts scripts/verify-exam-calculator.ts`
- `npx tsx scripts/verify-exam-simulator.ts`
- `npx tsx scripts/verify-exam-calculator.ts`
- Browser walkthrough: all four sections, radio answers, flags/Navigator, incomplete review state, Yes/No tile assignment, most/least assignment, calculator keyboard arithmetic, final response counts.
