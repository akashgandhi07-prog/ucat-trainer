# Gold Standard: QR Conversions

## Image/PDF Extraction Blueprint

Use this section when analysing official-style QR conversion questions from screenshots or PDFs. Do not paste exact official wording, exact values, or screenshots here long term. Extract the reusable maths pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Visual type: text-only, table, chart, recipe, map, rate card, price list
- Quantity types: currency, distance, time, weight, volume, rate, percentage
- Given information: conversion factor, unit relationship, proportional rule, table value
- Task: convert units, scale rate, compare converted values, calculate final amount
- Reasoning pattern: multiply, divide, compound conversion, ratio scaling, unit cancellation
- Common trap: reversing conversion, mixing units, rounding too early, wrong rate
- Difficulty: easy, medium, or hard
- Visual requirements for a new original version
- What must vary: context, values, units, wording, answer

Template:

```md
### Pattern: [short name]

- Visual type:
- Quantity types:
- Given information:
- Task:
- Reasoning pattern:
- Common trap:
- Difficulty:
- Visual requirements:
- New original version must vary:
```

## Purpose

Teach students to convert quantities quickly and accurately under QR timing pressure.

## Required Qualities

- Units are explicit
- Correct answer is uniquely calculable
- Explanation shows the conversion direction
- Distractors reflect realistic conversion errors

## Required Fields

- section: `qr`
- trainer_type: `qr-conversions`
- question_kind: `mcq` or `numeric`
- difficulty
- skill_tag
- stem
- explanation
- content.question
- content.correctAnswer
- content.workedSolution

## Good Examples

Add strong original examples from our bank.

## Rejection Rules

- Reject if conversion direction is ambiguous
- Reject if rounding changes the answer unfairly
- Reject if official wording, values, or visual layout are copied
