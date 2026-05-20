# Gold Standard: SJT Ranking

## Image/PDF Extraction Blueprint

Use this section when analysing official-style SJT ranking questions from screenshots or PDFs. Do not paste exact official wording here long term. Extract the reusable ranking pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Scenario domain: safety, honesty, confidentiality, teamwork, communication, professionalism
- Role/context: student, colleague, patient-facing role, team setting
- Ranking task: best to worst, most appropriate to least appropriate, first to last
- Ranking principle: why the top action comes first and why the bottom action is worst
- Common trap: over-escalating first, doing nothing, acting outside competence, breaching trust
- Difficulty: easy, medium, or hard
- What must vary: setting, action options, order logic, wording

Template:

```md
### Pattern: [short name]

- Scenario domain:
- Role/context:
- Ranking task:
- Ranking principle:
- Common trap:
- Difficulty:
- New original version must vary:
```

## Purpose

Teach students to order responses according to professional judgement and practical priority.

## Required Qualities

- Ranking order is defensible
- Adjacent options are not too ambiguous
- Explanation compares the ordering, not just the best option
- Scenario is realistic

## Required Fields

- section: `sjt`
- trainer_type: `sjt-ranking`
- question_kind: `ranking`
- difficulty
- skill_tag
- stem
- explanation
- content.domain
- content.items

## Good Examples

Add strong original examples from our SJT bank.

## Rejection Rules

- Reject if two adjacent ranks could reasonably swap
- Reject if the safest action is not clearly prioritised
- Reject if official wording is copied
