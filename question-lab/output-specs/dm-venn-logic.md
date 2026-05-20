# DM Venn Logic — Output format

## What This Trainer Teaches

Students learn to extract information from Venn diagrams and apply set logic to find specific counts. The core skill is inclusion-exclusion reasoning: avoiding double-counting overlaps when finding "exactly one", "at least one", or "neither" values.

## Skills The AI Should Cover

- Two-set Venn: find "only A", "only B", "both", "neither", "at least one", total
- Three-set Venn: find "exactly one set", "exactly two sets", "all three", "none"
- Missing-region problems: given totals and some regions, find the missing one
- Table-to-Venn: information given as a table, student must identify the set structure
- Proportion/percentage variants: some values given as percentages rather than counts

Aim for roughly: 40% two-set, 40% three-set, 20% missing-region or harder variants.
Difficulty split: 30% easy, 50% medium, 20% hard.

## Our Explanation Style

Do NOT just give the answer. The explanation must walk through the set logic step by step.

Good explanation structure:
1. Name the sets and what each region represents
2. Show the key equation (e.g. Total = Only A + Only B + Both + Neither)
3. Substitute the known values
4. Solve for the unknown
5. Name the trap (e.g. "Students who confused 'at least one' with 'exactly one' chose B")

The tone is teaching, not marking. Write as if explaining to a student who got it wrong.

Official UCAT explanations often just say "the answer is X because the diagram shows Y." Our explanations show the method so the student can replicate it on any Venn question.

## Note On Images

Venn diagram images cannot be generated automatically yet. Until image generation is available via OpenRouter, write questions where the diagram information is fully described in text (e.g. "In a group of 80 students, 45 study French, 32 study Spanish, and 18 study both."). Do not require a visual diagram to answer the question.

## JSON output (one question)

Return an array of objects in this shape when generating new questions:

```json
{
  "id": "venn-exactly-two-042",
  "trainerType": "venn-logic",
  "difficulty": "medium",
  "skillTag": "exactly-two",
  "stem": "Scenario with all set counts in text",
  "question": "The MCQ question line",
  "options": [
    { "id": "A", "text": "..." },
    { "id": "B", "text": "..." },
    { "id": "C", "text": "..." },
    { "id": "D", "text": "..." }
  ],
  "correctAnswer": "B",
  "explanation": "Our step-by-step explanation with trap named",
  "commonTrap": "includes-all-three-incorrectly",
  "generalRule": "Reusable rule for this skill",
  "wrongOptionReasons": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "keyInsight": "Short memory hook",
  "review": { "ambiguityRisk": "low", "whySafeToInclude": "..." }
}
```

