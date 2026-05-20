# Gold Standard: DM Venn Logic

## Image/PDF Extraction Blueprint

Use this section when analysing official-style Venn diagram questions from screenshots or PDFs. Do not paste exact official wording, exact numbers, or screenshots here long term. Extract the reusable pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Visual type: two-set Venn, three-set Venn, table-to-Venn, missing-region Venn
- Set labels in generic terms: e.g. three activities, three subjects, three preferences
- Given information: totals, set totals, overlap totals, region values, outside-set value
- Task: exactly one set, at least one set, neither, one missing region, compare regions
- Reasoning pattern: inclusion-exclusion, sum regions, subtract from total, avoid double counting
- Common trap: exactly vs at least, pairwise overlap vs triple overlap, forgetting outside group
- Difficulty: easy, medium, or hard
- Visual requirements for a new original version
- What must vary: context, labels, numbers, wording, answer, diagram layout

Template:

```md
### Pattern: [short name]

- Visual type:
- Generic set labels:
- Given information:
- Task:
- Reasoning pattern:
- Common trap:
- Difficulty:
- Visual requirements:
- New original version must vary:
```

## Purpose

Teach students how to reason from Venn diagrams and set relationships in Decision Making.

## Required Qualities

- One unambiguous correct answer
- Diagram or text is internally consistent
- Explanation teaches the set logic, not just the answer
- Distractors reflect realistic double-counting traps
- No outside knowledge required

## Required Fields

- section: `dm`
- trainer_type: `venn-logic`
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

- Reject if two options are defensible
- Reject if the diagram values do not add up
- Reject if the explanation skips the key set operation
- Reject if it relies on copied official wording or numbers

## Review Checklist

- Is the set relationship clear?
- Is the correct answer uniquely correct?
- Is the common trap realistic?
- Does the explanation show the counting method?
- Is the difficulty label fair?
