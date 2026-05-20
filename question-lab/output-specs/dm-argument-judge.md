# DM Argument Judge: Output format

## Explanation formatting (required)

Use **line breaks between steps** (`Step 1:`, `Step 2:`, … with `\n\n` in JSON). **No em dash or en dash** (`—` `–`). See `_shared-explanation-formatting.md`.

---

## What This Trainer Teaches

Students learn to evaluate the strength of arguments by judging relevance, directness, and logical support — not by personal opinion. The core skill is distinguishing a strong argument (directly addresses the claim with real impact) from a weak one (tangential, emotional, irrelevant, or based on a flawed assumption).

## Skills The AI Should Cover

- Identify the strongest argument for a position
- Identify the strongest argument against a position
- Identify the weakest argument overall
- Spot irrelevant true statements (true but doesn't address the claim)
- Spot emotional appeals presented as logic
- Spot weak correlations or anecdote-based arguments
- Spot overclaims and unsupported assumptions

Aim for roughly: 50% "strongest argument" questions, 30% "weakest argument" questions, 20% mixed or multi-step evaluation.
Difficulty split: 25% easy, 50% medium, 25% hard.

## Our Explanation Style

Do NOT just say which argument is strongest. The explanation must compare arguments and explain the logic used to rank them.

Good explanation structure:
1. State the claim being evaluated
2. Apply the UCAT criterion: does the argument directly address the claim? Is the impact real and significant?
3. Eliminate each wrong option and say why it fails (too narrow, emotional, irrelevant, assumes too much)
4. Confirm the correct answer and say why it passes the criterion
5. Name the trap (e.g. "Option B sounds compelling but it introduces a different issue rather than addressing the original claim")

The tone is teaching argument evaluation as a transferable skill. The student should finish the explanation knowing how to apply the same reasoning to any argument question.

Official UCAT explanations often just confirm the answer. Our explanations teach the evaluation method.

## What Makes A Strong UCAT Argument

- Directly addresses the specific claim in the question
- Has clear, significant real-world impact
- Does not rely on assumptions not stated
- Is not based purely on emotion or anecdote
- Is not a true-but-irrelevant statement


## Storage contract (product)

On import, each question becomes a `trainer_questions` row:

| Column | Your JSON field |
|---|---|
| `legacy_id` | `id` |
| `stem` | `stem` |
| `explanation` | `explanation` (student-facing, no meta commentary) |
| `skill_tag` | `skillTag` |
| `content` | MCQ payload below (import adds `optionsList` from `options`) |

Students load active rows via `get_dm_trainer_drill('argument-judge')`. Option `label` values and `review` must live in `content` so the Argument Judge UI can rank arguments.

## JSON output (one question)

Return a JSON array. Each object:

```json
{
  "id": "arg-strongest-for-001",
  "trainerType": "argument-judge",
  "difficulty": "medium",
  "skillTag": "strongest-argument-for",
  "stem": "Scenario text",
  "question": "Which is the strongest argument for the claim?",
  "options": [
    {"id": "A", "text": "...", "label": "true-but-irrelevant"},
    {"id": "B", "text": "...", "label": "directly-relevant"},
    {"id": "C", "text": "...", "label": "partially-relevant"},
    {"id": "D", "text": "...", "label": "unsupported-assumption"}
  ],
  "correctAnswer": "B",
  "explanation": "Step 1: State the claim...\n\nStep 2: Compare each option...\n\nStep 3: Confirm the correct answer...\n\nStep 4: Trap: ...",
  "commonTrap": "irrelevant-true-statement",
  "generalRule": "Strongest = directly addresses the claim with real impact",
  "wrongOptionReasons": {"A": "...", "B": "Correct.", "C": "...", "D": "..."},
  "keyInsight": "One sentence hook",
  "review": {
    "exactAim": "Identify the strongest argument for the stated claim",
    "whyCorrect": "B directly addresses the claim with significant impact",
    "whyAIsWrong": "True but does not address the claim",
    "whyBIsWrong": "N/A (correct)",
    "whyCIsWrong": "Only partially addresses the claim",
    "whyDIsWrong": "Relies on an unsupported assumption",
    "ambiguityRisk": "low",
    "whySafeToInclude": "One clear strongest argument; distractors map to named flaws"
  }
}
```

`label` must be one of: `directly-relevant`, `partially-relevant`, `true-but-irrelevant`, `too-narrow`, `unsupported-assumption`, `overclaim`, `vague`, `does-not-answer-aim`, `only-addresses-one-criterion`.
