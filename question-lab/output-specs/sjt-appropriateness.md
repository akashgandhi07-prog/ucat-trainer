# SJT Appropriateness: Output format

## Explanation formatting (required)

Use **line breaks between points** in stem rationales where needed. **No em dash or en dash** (`:` ` to `) in any student-facing text. See `_shared-explanation-formatting.md`.

---

## What This Trainer Teaches

Students learn to rate how appropriate each response is to a professional scenario involving a medical student or junior doctor. The rating scale is:

- **A very appropriate thing to do**: a sound action addressing at least one aspect of the situation, without a material drawback in the stated context
- **Appropriate but not ideal**: an acceptable action with a specific limitation in how it is carried out
- **Inappropriate but not awful**: an unhelpful or poorly judged action whose stated consequences do not justify the strongest negative rating
- **A very inappropriate thing to do**: a seriously harmful, dishonest, unsafe or otherwise clearly unacceptable action

Rate each response independently. Several responses may receive the same rating. A response does not have to solve every aspect of the situation to be very appropriate. Do not downgrade a safe, useful action just because a different option is more comprehensive or more direct. Never force one response into each rating category.

The core skill is applying professional values (patient safety, honesty, teamwork, confidentiality, duty of candour) to realistic dilemmas : without relying on niche GMC policy knowledge.

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
2. For each response: explain its rating using the stated facts and the relevant professional principle
3. Explain the harm or limitation of negative responses without inventing consequences
4. Explain why each adjacent rating is less defensible for that response, without comparing it with a different response
5. Name the most common trap students fall into with this scenario type

The tone is mentoring, not just marking. The student should understand the professional logic, not just the score.

Official UCAT explanations are often brief. Our explanations teach the reasoning framework.

## Key Professional Principles To Reference

- Prioritise patient safety while respecting consent, confidentiality and the person's role
- Be honest and respond openly to mistakes; do not assume every near miss has identical disclosure requirements
- Act within your competence and seek appropriate supervision
- Confidentiality with defined exceptions (risk to self/others)
- Choose a safe, proportionate route for raising concerns. Direct confrontation is not a compulsory first step, especially where urgency, intimidation or a serious concern makes another route preferable
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
