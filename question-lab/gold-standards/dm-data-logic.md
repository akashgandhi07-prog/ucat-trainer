# Gold Standard: DM Data Logic

## Image/PDF Extraction Blueprint

Use this section when analysing official-style data/table/chart questions from screenshots or PDFs. Do not paste exact official wording, exact numbers, or screenshots here long term. Extract the reusable pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Visual type: table, bar chart, line chart, pie chart, stacked chart, mixed data display
- Axes/labels in generic terms: e.g. years, groups, categories, percentages, counts
- Given information: visible values, totals, rates, proportions, missing values
- Task: compare values, calculate percentage change, infer total, identify strongest claim
- Reasoning pattern: ratio, proportion, weighted average, difference, percentage change, estimate
- Common trap: wrong denominator, units mismatch, reading wrong axis, percentage-point confusion
- Difficulty: easy, medium, or hard
- Visual requirements for a new original version
- What must vary: topic, labels, values, units, wording, answer

Template:

```md
### Pattern: [short name]

- Visual type:
- Generic axes/labels:
- Given information:
- Task:
- Reasoning pattern:
- Common trap:
- Difficulty:
- Visual requirements:
- New original version must vary:
```

## Purpose

Teach students how to interpret structured data and make valid conclusions under Decision Making timing pressure.

## Required Qualities

- One unambiguous correct answer
- Data display is readable and internally consistent
- Explanation identifies the relevant comparison or calculation
- Distractors represent realistic denominator, unit, or comparison errors

## Required Fields

- section: `dm`
- trainer_type: `data-logic`
- question_kind: `mcq`
- difficulty
- skill_tag
- stem
- explanation
- content.question
- content.options
- content.correctAnswer
- content.commonTrap

## Good Examples

Add 2-5 strong original questions from our bank.

## Bad Examples

Add patterns to avoid.

## Rejection Rules

- Reject if the chart/table cannot support the claimed answer
- Reject if more than one option can be argued
- Reject if the explanation hides the denominator or comparison step
- Reject if it copies official wording, values, or visual design too closely

## Review Checklist

- Is the data display clear?
- Are units and denominators explicit?
- Is the answer uniquely correct?
- Are distractors plausible?
- Does the explanation teach the transferable data skill?
