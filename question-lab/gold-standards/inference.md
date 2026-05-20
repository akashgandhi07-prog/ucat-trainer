# Gold Standard: Inference

## Image/PDF Extraction Blueprint

Use this section when analysing official-style inference questions from screenshots or PDFs. Do not paste exact official passage wording here long term. Extract the reusable inference pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Passage type: scientific, social, historical, policy, narrative, explanatory
- Evidence style: explicit statement, implied relationship, contrast, causal claim, limitation
- Task: must be true, most supported, cannot be inferred, strengthens/weakens
- Reasoning pattern: direct evidence, cautious inference, eliminate overclaims, compare claims
- Common trap: outside knowledge, overgeneralisation, confusing correlation and cause
- Difficulty: easy, medium, or hard
- Evidence requirement for a new original version
- What must vary: topic, wording, passage content, claims, answer

Template:

```md
### Pattern: [short name]

- Passage type:
- Evidence style:
- Task:
- Reasoning pattern:
- Common trap:
- Difficulty:
- Evidence requirement:
- New original version must vary:
```

## Purpose

Teach students to make only the inference supported by the passage.

## Required Qualities

- Correct answer is supported by text evidence
- Distractors include common overclaims
- Explanation identifies the relevant evidence
- No outside knowledge required

## Required Fields

- section: `vr`
- trainer_type: `inference`
- question_kind: `mcq`
- difficulty
- skill_tag
- stem
- explanation
- content.question
- content.options
- content.correctAnswer

## Good Examples

Add strong original examples from our bank.

## Rejection Rules

- Reject if the answer requires outside knowledge
- Reject if evidence text does not clearly support the answer
- Reject if official passage wording is copied
