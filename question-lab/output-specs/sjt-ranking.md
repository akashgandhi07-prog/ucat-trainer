# SJT Ranking — Output format

## What This Trainer Teaches

Students learn to rank a set of responses to a professional scenario from most to least appropriate. The core skill is comparing responses against each other — not just rating them in isolation — and using professional judgement to place them in the right order.

The format: given a scenario and 4–5 response options, rank all of them from most to least appropriate.

## Domains To Cover

- Scenarios involving patient safety where actions must be sequenced correctly
- Scenarios where escalation timing matters (do something yourself first vs go straight to senior)
- Scenarios involving conflict with a colleague
- Scenarios involving communication with a patient or relative
- Scenarios involving competing duties (e.g. end a task vs attend to an urgent concern)
- Scenarios where doing nothing is clearly worst

Aim for scenarios where the top action and bottom action are clear, but the middle two create genuine difficulty.
Difficulty split: 25% easy (clear ordering), 50% medium (middle positions ambiguous), 25% hard (all four positions genuinely close).

## Our Explanation Style

Do NOT just state the ranking order. The explanation must justify the relative positions.

Good explanation structure:
1. State the correct ranking with a one-line label for each option (e.g. "1st: Tell the registrar immediately — safety comes first")
2. Explain why option 1 beats option 2 (not just that it's better, but what principle makes it take priority)
3. Explain why the last option is worst — what harm or breach it causes
4. Address the hardest comparison: why the third-ranked option beats the fourth (this is where most students go wrong)
5. Name the most common ordering mistake

The tone is teaching comparative professional judgement. Students need to understand the ordering logic so they can apply it to any ranking question.

## Key Ordering Principles

- Address safety-critical issues before administrative concerns
- Seek help/escalate when outside your competence — but try to handle it directly first when safe
- Doing something imperfectly is usually ranked above doing nothing
- Breaching confidentiality or acting dishonestly is almost always near the bottom
- Acting alone on something serious without telling anyone is usually near the bottom


## JSON output (one question)

```json
{
  "id": "rank-xxx-001",
  "type": "ranking",
  "domain": "patients_partnership_communication",
  "difficulty": "standard",
  "stem": "Scenario",
  "items": [
    {"id":"a","text":"...","rank":1,"rationale":"..."}
  ]
}
```
