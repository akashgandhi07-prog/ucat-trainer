# Gold Standard: DM Argument Judge

## Image/PDF Extraction Blueprint

Argument Judge questions are usually text-first, but screenshots/PDFs may include official-style stems. Do not paste exact official wording here long term. Extract the reusable argument pattern only.

For each source question, capture:

- Source label: short private reference name, not copied question text
- Scenario domain in generic terms: school policy, healthcare access, transport, public services
- Claim type: should/should not, strongest argument, weakest argument, assumption, consequence
- Decision criterion: relevance, directness, evidence, ethical priority, practical impact
- Task: identify strongest argument, identify weakest argument, evaluate support
- Reasoning pattern: direct consequence, stakeholder impact, feasibility, evidence quality
- Common trap: emotional appeal, irrelevant true statement, weak correlation, outside knowledge
- Difficulty: easy, medium, or hard
- What must vary: topic, actors, wording, argument content, answer

Template:

```md
### Pattern: [short name]

- Generic scenario domain:
- Claim type:
- Decision criterion:
- Task:
- Reasoning pattern:
- Common trap:
- Difficulty:
- New original version must vary:
```

## Purpose

Teach students to judge argument strength based on relevance, directness, and support rather than personal opinion.

## Required Qualities

- One option is clearly the strongest or weakest by UCAT-style reasoning
- Explanation compares why the correct answer beats the distractors
- Distractors include plausible but flawed arguments
- No outside knowledge required

## Required Fields

- section: `dm`
- trainer_type: `argument-judge`
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

- Reject if the answer depends on opinion
- Reject if the strongest/weakest distinction is too subtle
- Reject if the explanation merely restates the answer
- Reject if official wording or argument options are copied

## Review Checklist

- Is the criterion clear?
- Is the correct option uniquely strongest/weakest?
- Are distractors plausible but genuinely weaker?
- Does the explanation teach transferable argument evaluation?
