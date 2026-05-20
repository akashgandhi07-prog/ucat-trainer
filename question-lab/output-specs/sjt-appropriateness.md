# SJT Appropriateness: Output format

## Explanation formatting (required)

Use **line breaks between points** in stem rationales where needed. **No em dash or en dash** (`—` `–`) in any student-facing text. See `_shared-explanation-formatting.md`.

---

## What This Trainer Teaches

Students learn to rate how appropriate each response is to a professional scenario involving a medical student or junior doctor. The rating scale is:

- **A very appropriate thing to do** — directly addresses the situation in line with professional values
- **Appropriate but not ideal** — helpful but not the best response; misses something
- **Inappropriate but not awful** — unhelpful or slightly wrong but not dangerous
- **A very inappropriate thing to do** — harmful, dishonest, unsafe, or a clear breach of duty

The core skill is applying professional values (patient safety, honesty, teamwork, confidentiality, duty of candour) to realistic dilemmas — without relying on niche GMC policy knowledge.

## Domains To Cover

- Patient safety: error or risk not reported
- Confidentiality: pressure to share information
- Teamwork: colleague behaviour, conflict, bullying
- Honesty: pressure to deceive patients or supervisors
- Workload and boundaries: being asked to do something beyond competence
- Communication: breaking bad news, consent, misunderstanding with patient
- Professionalism: appearance, punctuality, social media

Aim for roughly even coverage across domains. Include at least one question per domain.
Difficulty split: 30% easy (clear good vs bad), 50% medium (nuanced), 20% hard (competing duties).

## Our Explanation Style

Do NOT just state the scores. The explanation must link each score to a professional principle.

Good explanation structure:
1. Summarise the core dilemma in the scenario
2. For the A-rated response: explain why this is very appropriate — what principle it upholds and why acting this way matters
3. For the D-rated response: explain why this is very inappropriate — what harm or breach it causes
4. For B and C responses: explain the gradient — what makes one slightly better or worse than the other
5. Name the most common trap students fall into with this scenario type

The tone is mentoring, not just marking. The student should understand the professional logic, not just the score.

Official UCAT explanations are often brief. Our explanations teach the reasoning framework.

## Key Professional Principles To Reference

- Patient safety always comes first
- Honesty and duty of candour are non-negotiable
- Acting within your own competence — escalate when uncertain
- Confidentiality with defined exceptions (risk to self/others)
- Teamwork: address concerns directly before escalating where safe to do so
- Do not act alone in serious situations


## Storage contract (product)

On import: `legacy_id` = `id`, `stem`, `skill_tag` = `domain`, `content` = `{ domain, items, pivotInsight? }`. `trainer_type` is `sjt-appropriateness`. Ratings use underscores: `very_appropriate`, `appropriate`, `inappropriate`, `very_inappropriate`.

## JSON output (one question)

```json
{
  "id": "app-xxx-001",
  "domain": "colleagues_culture_safety",
  "difficulty": "medium",
  "stem": "Scenario",
  "pivotInsight": "Core dilemma",
  "items": [
    {
      "id": "a",
      "text": "Response A",
      "correctRating": "very_appropriate",
      "rationale": "Why this rating",
      "whyNotAdjacent": "Why not one step up or down"
    }
  ]
}
```
