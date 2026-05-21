# DM Venn Logic: Question Generation Rules v2

## Explanation formatting (required)

Use **line breaks between steps** (`Step 1:`, `Step 2:`, … with `\n\n` in JSON). **No em dash or en dash** (`—` `–`). See `_shared-explanation-formatting.md`.

---

## What This Trainer Teaches

Students learn to extract information from Venn diagrams and apply set logic to find specific counts. The core skill is inclusion-exclusion reasoning: avoiding double-counting overlaps when finding "exactly one", "at least one", or "neither" values.

This trainer covers **text-compatible Venn questions only** (see §3 for the visual-only types that are excluded until image generation is available).

---

## 1. Skills Taxonomy

### 1A. Text-Compatible Skills (generate these now)

These question types can be fully expressed in prose without a diagram.

| Skill Tag | Description | Example |
|---|---|---|
| `two-set-find-overlap` | Given totals and one region, find "both" | Library: 24 phones, 18 laptops, 8 neither — find both |
| `two-set-find-neither` | Given totals and overlap, find "neither" | Houses: given front/back/both counts, find neither |
| `two-set-must-be-true` | No fixed overlap given; reason about what is always true regardless of overlap | 48 people, 29 read, 9 watch TV — which must be true? |
| `three-set-find-region` | Given all pairwise and triple overlaps, find a specific region or set total | Cinema/Theatre/Museum: find total Museum visitors |
| `three-set-find-none` | Given all overlaps, find how many are in none of the sets | Aquariums: 150 total, find none of three animals |
| `three-set-missing-region` | All regions given except one; total is known; solve algebraically | Daleham houses variant |
| `three-set-must-be-true` | Constraint-based: which statement must hold across all valid configurations | Reading/TV variant extended to three sets |
| `algebraic-constraint` | One or more values given as expressions (e.g. "twice as many"); solve via substitution | Cinema/Theatre/Museum: "twice as many Theatre+Museum as Cinema+Museum" |

### 1B. Visual-Only Types (do not generate yet — flag for future)

These question types **require a rendered diagram** and cannot be faithfully reproduced in text. Do not attempt text approximations — the reasoning skill tested is fundamentally spatial.

| Type | Description |
|---|---|
| Shape-membership Venn | Overlapping geometric shapes; a letter sits in a region; student identifies which sets it belongs to (sports academy, transport questions) |
| Diagram-selection | Four Venn diagrams shown as options; student selects the one that correctly represents the scenario (youth club question) |
| Region-counting from diagram | Student reads counts from a labelled diagram image rather than from prose (France/Spain/Greece diagram) |

When image generation becomes available, add these as `skillTag` values: `shape-membership`, `diagram-selection`, `diagram-read`.

### 1C. Excluded Types (never generate for this trainer)

These appeared in official UCAT materials but test a different skill and will pollute the Venn training signal if included.

| Type | Why Excluded |
|---|---|
| Combinatorics (ice cream flavours) | Tests combination counting (nCr), not set membership. Correct method uses C(n,k), not inclusion-exclusion. |
| Conditional probability (marbles) | Tests probability trees, not Venn diagrams. No set intersection is involved. |

If these are needed, they belong in a separate **Probabilistic Reasoning** or **Combinatorics** trainer.

---

## 2. Difficulty Definitions

Use these precise definitions — not vague labels.

### Easy
- All values are given directly in the stem.
- A single equation solves the problem.
- No algebraic unknowns; no multi-step chaining.
- Example: *40 people; 24 have phones, 18 have laptops, 8 have neither. Find both.*

### Medium
- Values must be extracted from prose (e.g. "no student went to both X and Y", "twice as many went to Y as X").
- Two or more equations required, or one equation with an algebraic unknown.
- Student must build the Venn mentally before solving.
- Example: *Cinema/Theatre/Museum — derive all region counts from constraints, then compare two set totals.*

### Hard
- Constraint-based or "must be true" logic: no single numerical answer exists; student must reason about ranges or necessary conditions.
- Algebraic constraints with multiple unknowns requiring simultaneous reasoning.
- Deliberately ambiguous-looking stems where a trap answer is arithmetically close to correct.
- Example: *48 people, 29 read, 9 watch TV — which statement must be true regardless of overlap?*

**Target split: 30% easy, 50% medium, 20% hard.**

---

## 3. Question Construction Rules

### Stem requirements
- All numerical information needed to solve the question must appear in the stem. No values should require inference from context not given.
- Constraints must be logically consistent. Before writing options, verify the Venn yourself: assign values to all regions and confirm they sum correctly.
- For `algebraic-constraint` questions, express the constraint in natural language ("twice as many", "four fewer than") — not as an equation. The student derives the equation.
- For `must-be-true` questions, do not give the overlap value. The question tests whether students recognise what is fixed vs what can vary.

### Distractor construction
Each wrong option must correspond to a specific, nameable wrong method. Do not use arbitrary numbers as distractors.

Common wrong methods to use as distractor sources:
- **Double-count trap**: student adds set totals without subtracting overlap
- **Exclusive-vs-inclusive confusion**: student uses "only A" count where "A total" is needed
- **All-three subtracted once**: student subtracts the all-three region from each pairwise overlap instead of recognising it is already included
- **Neither ignored**: student omits the "neither" region from the total equation
- **Complement confusion**: student uses |not A| where |A| is needed

### Answer uniqueness
Every question must have exactly one defensible correct answer. Before finalising, verify:
1. The correct answer is reachable by the intended method.
2. No other option is reachable by a valid alternative reading of the stem.
3. For "must be true" questions: the correct answer holds under all valid configurations; each wrong answer fails under at least one.

---

## 4. Explanation Style

Do **not** just give the answer. Explanations must teach the **fast UCAT mental model** students use under time pressure: short steps, plain arithmetic, no unnecessary algebra.

Output as **numbered steps with blank lines between them** (in JSON: `\n\n` before each Step label after Step 1, and after each `Step N:` before the body). See `_shared-explanation-formatting.md`.

### Tone
- Concise, scannable, teaching (not marking).
- One idea per step. Prefer whole-number arithmetic shown inline (e.g. `50 − 10 = 40`).
- Write as if the student got it wrong and needs a method they can reuse quickly.

### 4A. Fast two-set method (required for these skill tags)

Use this structure for **`two-set-find-overlap`** and **`two-set-find-neither`** when the stem gives a total and a **neither** count (or when overlap is the only unknown and neither is known).

**Do not** expand into `Only A + Only B + Both + Neither` with a `Both` unknown (e.g. avoid `50 = (30 − Both) + (25 − Both) + Both + 10`). That is mathematically correct but too slow for UCAT.

**Required steps (3 to 4 steps plus trap):**

1. **Step 1:** Start from **neither** (if given) or what the question asks. Compute **at least one** when neither is known: `Total − Neither = …`
2. **Step 2:** Add the two set totals. State clearly that this **double-counts** students in both.
3. **Step 3:** Subtract the at-least-one total once to get overlap (or apply the one-line fix for the skill). End with **Therefore, …** and the answer.
4. **Step 4 or 5 (trap):** Name the wrong method behind the main trap option (e.g. neither ignored, double-count without subtracting overlap).

**Gold exemplar** (match this pacing and clarity for similar stems):

```
Step 1:

10 students play neither sport, so the number who play at least one sport is:

50 − 10 = 40

Step 2:

If we add the football and basketball groups:

30 + 25 = 55

But this counts students who play both sports twice.

Step 3:

So subtract the overlap once:

55 − 40 = 15

Therefore, 15 students play both sports.

Step 4:

Students who chose B added 30 + 25 = 55, subtracted 50, and got 5, forgetting the 10 who play neither.
```

`generalRule` for this family: *At least one = Total − Neither; Overlap = (Set A + Set B) − At least one.*

### 4B. Full region / inclusion-exclusion (three-set and harder)

For **`three-set-*`**, **`algebraic-constraint`**, and **`two-set-must-be-true`** / **`three-set-must-be-true`**, use more steps as needed:

1. **Step 1:** Name sets / regions or constraints.
2. **Step 2:** State the governing equation (inclusion-exclusion or constraint).
3. **Step 3:** Substitute known values.
4. **Step 4:** Solve (show arithmetic).
5. **Step 5:** Name the trap.

### What to avoid (all Venn explanations)
- Do not use "subtract all-three from each set total" for three-set problems (teaches the wrong habit). Use full inclusion-exclusion.
- Do not assert the answer is correct "because the diagram shows it" without arithmetic.
- Do not use five algebra-heavy steps for a basic two-set overlap when §4A applies.

---

## 5. General Rules Field

The `generalRule` field must contain a formula or a named procedure — not a piece of advice.

**Bad**: *"Remember not to double-count overlaps."*  
**Good**: *"|A ∪ B| = |A| + |B| − |A ∩ B|; subtract the overlap once to avoid double-counting."*

**Bad**: *"Work out each region carefully."*  
**Good**: *"For three sets: Total in at least one = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|"*

---

## 6. Target Question Mix

| Skill Tag | Approximate share |
|---|---|
| `two-set-find-overlap` | 15% |
| `two-set-find-neither` | 10% |
| `two-set-must-be-true` | 10% |
| `three-set-find-region` | 20% |
| `three-set-find-none` | 15% |
| `three-set-missing-region` | 10% |
| `algebraic-constraint` | 15% |
| `three-set-must-be-true` | 5% |

---

## 7. Storage contract (product)

On import, each question becomes a `trainer_questions` row. `stem` and `explanation` are columns; MCQ fields live in `content` JSONB (import adds `optionsList` from `options`). Students load active rows via `get_dm_trainer_drill('venn-logic')` with full teaching fields.

## 8. JSON Schema

Return one object per question. All fields are required unless marked optional.

```json
{
  "id": "venn-two-set-find-overlap-001",
  "trainerType": "venn-logic",
  "difficulty": "easy",
  "skillTag": "two-set-find-overlap",
  "requiresVisual": false,
  "stem": "Full scenario text with all values needed to solve the question.",
  "question": "The MCQ question line, ending with a question mark.",
  "options": [
    { "id": "A", "text": "..." },
    { "id": "B", "text": "..." },
    { "id": "C", "text": "..." },
    { "id": "D", "text": "..." }
  ],
  "correctAnswer": "A",
  "explanation": "Step 1: Neither → at least one (arithmetic)...\n\nStep 2: Add set totals, note double-count...\n\nStep 3: Subtract once → overlap. Therefore, ...\n\nStep 4: Trap: ...",
  "commonTrap": "double-count-trap",
  "generalRule": "Formula or named procedure — not a piece of advice.",
  "wrongOptionReasons": {
    "A": "Correct.",
    "B": "Reached by [specific wrong method].",
    "C": "Reached by [specific wrong method].",
    "D": "Reached by [specific wrong method]."
  },
  "keyInsight": "One sentence memory hook that names the core principle tested.",
  "review": {
    "uniqueAnswer": true,
    "ambiguityRisk": "low",
    "distractorQuality": "high",
    "distractorNote": "Each wrong option maps to a nameable wrong method.",
    "whySafeToInclude": "All values consistent; verified by building full Venn before writing options."
  },
  "solutionFormula": "|A∩B| = |A| + |B| − total + neither (one line)",
  "computedAnswer": 6,
  "distractorLogic": "B: double-count overlap; C: forgot neither; D: used |A|+|B| only"
}
```

### Field notes

- `solutionFormula`, `computedAnswer`, `distractorLogic`: Required on every draft for automated verification. Stripped before students see the question. `computedAnswer` must match the keyed option value.
- `requiresVisual`: Set `true` only for the visual-only types in §1B. All current questions should be `false`.
- `commonTrap`: Use a slug from this controlled list: `double-count-trap`, `exclusive-vs-inclusive`, `all-three-subtracted-once`, `neither-ignored`, `complement-confusion`, `must-be-true-range-ignored`.
- `distractorQuality`: `"high"` = every wrong option maps to a nameable wrong method. `"medium"` = most do. `"low"` = some are arbitrary — flag for revision.
- `keyInsight`: Should complete the sentence *"The thing to remember here is..."* — one sentence, no jargon.

---

## 9. Self-Check Before Finalising Any Question

Before outputting a question, verify:

- [ ] Built the full Venn (all regions) and confirmed all values sum to the stated total.
- [ ] Each wrong option is reachable by a specific, named wrong method.
- [ ] For `two-set-find-overlap` / `two-set-find-neither` with neither given: explanation uses §4A fast method (not `(30 − Both)` style algebra).
- [ ] For three-set questions: explanation uses full inclusion-exclusion, not the "subtract all-three from each set" shortcut.
- [ ] For `must-be-true` questions: checked at least two different valid overlap configurations to confirm the correct answer holds for both and each wrong answer fails for at least one.
- [ ] No combinatorics or probability reasoning is required to answer the question.
- [ ] `generalRule` contains a formula or procedure, not advice.

Rules for output:
- explanations are FINAL student-facing text only, with `\n\n` between steps, no em dash or en dash
- never write: "let me", "recheck", "redesign", "note:", "wait", "actually", "this question requires revision"
- for "must be true": test overlap at minimum and maximum, then eliminate each option; one correct answer only
- if you fix a number, fix the stem silently; do not describe the fix in the explanation
- generate at most 5 questions per reply
- return JSON array only