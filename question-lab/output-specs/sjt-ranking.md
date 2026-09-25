# SJT Ranking: Output format

## Explanation formatting (required)

Use **line breaks between ranking points** in rationales where needed. **No em dash or en dash** (`:` ` to `) in any student-facing text. See `_shared-explanation-formatting.md`.

---

## What This Trainer Teaches

Students learn to rank a set of responses to a professional scenario from most to least appropriate. The core skill is comparing responses against each other : not just rating them in isolation : and using professional judgement to place them in the right order.

The format in this trainer: exactly three responses. Students select the most and least appropriate response. Store unique ranks 1, 2 and 3; do not ask students to order four or five options.

## Domains To Cover

- Scenarios involving patient safety where actions must be sequenced correctly
- Scenarios where escalation timing matters (do something yourself first vs go straight to senior)
- Scenarios involving conflict with a colleague
- Scenarios involving communication with a patient or relative
- Scenarios involving competing duties (e.g. end a task vs attend to an urgent concern)
- Scenarios where doing nothing is clearly worst

The top and bottom responses must be defensible from the stated facts. Explain both comparisons: why rank 1 is better than rank 2, and why rank 2 is better than rank 3. Difficulty should come from competing considerations, not unresolved ambiguity or missing information. Do not force a difficulty quota when it weakens the key.

## Our Explanation Style

Do NOT just state the ranking order. The explanation must justify the relative positions.

Good explanation structure:
1. State the correct ranking with a one-line label for each option (e.g. "1st: Tell the registrar immediately : safety comes first")
2. Explain why option 1 beats option 2 (not just that it's better, but what principle makes it take priority)
3. Explain why the last option is worst : what harm or breach it causes
4. Explain why the middle response is better than the least appropriate response but worse than the most appropriate response
5. Name the most common ordering mistake

The tone is teaching comparative professional judgement. Students need to understand the ordering logic so they can apply it to any ranking question.

## Key Ordering Principles

- Address safety-critical issues before administrative concerns
- Seek help/escalate when outside your competence : but try to handle it directly first when safe
- Consider the actual consequences. An active harmful intervention can be worse than inaction
- Breaching confidentiality or acting dishonestly is almost always near the bottom
- Acting alone on something serious without telling anyone is usually near the bottom


## Storage contract (product)

On import: `legacy_id` = `id`, `stem`, `skill_tag` = `domain`, `content` = `{ domain, items, pivotInsight? }`. `trainer_type` is `sjt-ranking`. Exactly three responses, each with `rank` 1 (best), 2, or 3 (worst).

## JSON output (one question)

```json
{
  "id": "rank-xxx-001",
  "domain": "patients_partnership_communication",
  "difficulty": "medium",
  "stem": "Scenario",
  "pivotInsight": "Core ordering principle",
  "items": [
    {"id": "a", "text": "Best action", "rank": 1, "rationale": "Why first"},
    {"id": "b", "text": "Second", "rank": 2, "rationale": "Why second"},
    {"id": "c", "text": "Worst", "rank": 3, "rationale": "Why last"}
  ]
}
```
