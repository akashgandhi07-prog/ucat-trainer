# SJT Importance — Output format

## What This Trainer Teaches

Students learn to rate how important each consideration is when deciding how to respond to a professional scenario. The rating scale is:

- **Very important** — must be considered; directly affects the correct response
- **Important** — worth considering but not the primary concern
- **Of minor importance** — relevant but would not significantly change what you do
- **Not important at all** — irrelevant to the professional decision

The core skill is prioritising correctly across competing professional concerns — not just knowing what matters in general, but knowing what matters *in this specific situation*.

## Domains To Cover

- What consideration is most important when patient safety is at risk
- When confidentiality competes with another duty
- When a colleague's wellbeing is at stake
- When efficiency or workload conflicts with thoroughness
- When personal preference conflicts with professional duty
- When information is uncertain or incomplete

Aim for scenarios where the difficulty comes from distinguishing "very important" from "important" — the easy traps are things students think sound important but are irrelevant to this specific scenario.
Difficulty split: 25% easy, 50% medium, 25% hard.

## Our Explanation Style

Do NOT just state the ratings. The explanation must say why each factor is ranked where it is.

Good explanation structure:
1. Summarise what decision is being made in the scenario
2. For the "Very important" item: explain what would go wrong if this were ignored
3. For the "Not important" item: explain why it sounds relevant but is not actually a factor here
4. For middle items: explain the gradient — what makes one factor more pressing than another in this context
5. Name the most common prioritisation mistake for this scenario type

The tone is teaching priority-setting as a professional skill. The student should understand the reasoning, not just memorise the answers.

## Key Prioritisation Rules

- Safety-critical information is always very important
- Procedural compliance matters but usually ranks below direct harm prevention
- Personal feelings and preferences are rarely "very important" in professional decisions
- "Important" does not mean irrelevant — it means worth considering but not the main driver
- Context changes rankings: the same factor can be very important in one scenario and minor in another


## Storage contract (product)

On import: `legacy_id` = `id`, `stem`, `skill_tag` = `domain`, `content` = `{ domain, items, pivotInsight? }`. `trainer_type` is `sjt-importance`. Ratings: `very_important`, `important`, `minor_importance`, `not_important`.

## JSON output (one question)

```json
{
  "id": "imp-xxx-001",
  "domain": "patients_partnership_communication",
  "difficulty": "medium",
  "stem": "Scenario",
  "pivotInsight": "Core dilemma",
  "items": [
    {
      "id": "a",
      "text": "Factor A",
      "correctRating": "very_important",
      "rationale": "Why this rating",
      "whyNotAdjacent": "Why not one step up or down"
    }
  ]
}
```
