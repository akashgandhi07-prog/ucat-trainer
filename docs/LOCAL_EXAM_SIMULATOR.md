# Local UCAT simulator

Run `npm run dev -- --host 127.0.0.1 --port 5187` and open http://127.0.0.1:5187/exam-simulator.html.

Tutor question database: http://127.0.0.1:5187/question-database.html.

This is a separate Vite HTML entry. The main app does not import or link it, and the default production build does not include it. Nothing has been deployed. Do not add it to the production build inputs until publication is explicitly approved.

## Included

- A full-length 184-question shell (VR 44, DM 35, QR 36, SJT 69) using the captured timings, plus an eight-question interaction demo.
- Split VR/SJT and full-width DM/QR layouts based on the supplied captures.
- Single-choice, five-statement Yes/No, and most/least appropriate answers.
- Drag-and-drop tiles and keyboard-accessible select-tile/select-slot alternative.
- Section instructions, timed/untimed modes, 25% extra time, automatic timeout transitions.
- In-progress attempts are saved to `localStorage` and recoverable after a reload or restart in the same browser; signed-in users also sync to their account. If a timed section expires while the student is away, resuming shows a notice before moving on.
- Navigator, flags, review filters, section-end confirmation and response export.
- Calculator using the supplied SVG artwork with arithmetic, memory and keyboard input; draggable dialogs.
- Seven colour choices including the default theme.
- Official-style keyboard controls: hold Alt on Windows or Option on macOS,
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

This is a functional first version, not a verified exact replica. Icons, some instruction/review details and calculator edge cases differ. Calculator state resets when closed. Recalled memory, percentage and sign-change results behave as fresh entries, so the next digit starts a new number. Repeated-equals and percentage behaviour need comparison with the source calculator. Official scoring is not implemented. Draft recovery is per browser for guests; export at completion for a durable record. Imported question text is plain text, not rich HTML. Desktop layout is the fidelity target.

The supplied reference HTML and screenshots guided styling and interaction formats. Official question text is not included in the sample bank. No source session identifiers, analytics scripts or external exam endpoints are used.

## Verification

- `npx tsc -b --noEmit`
- `npx eslint src/exam-simulator src/question-database scripts/verify-exam-simulator.ts scripts/verify-exam-calculator.ts`
- `npx tsx scripts/verify-exam-simulator.ts`
- `npx tsx scripts/verify-exam-calculator.ts`
- Browser walkthrough: all four sections, radio answers, flags/Navigator, incomplete review state, Yes/No tile assignment, most/least assignment, calculator keyboard arithmetic, final response counts.
