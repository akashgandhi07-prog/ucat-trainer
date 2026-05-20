# DM Argument Judge — Output format

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


## JSON output (one question)

Return a JSON array. Each DM MCQ object:

```json
{
  "id": "unique-kebab-id-001",
  "trainerType": "argument-judge",
  "difficulty": "easy|medium|hard",
  "skillTag": "kebab-skill-tag",
  "stem": "Scenario text",
  "question": "Question line",
  "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
  "correctAnswer": "B",
  "explanation": "Step-by-step method and trap",
  "commonTrap": "trap-tag",
  "generalRule": "Reusable rule",
  "wrongOptionReasons": {"A":"...","B":"...","C":"...","D":"..."},
  "keyInsight": "Short hook"
}
```

Replace argument-judge with: venn-logic, data-logic, or argument-judge.
