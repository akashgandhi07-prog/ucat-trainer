# DM Unseeded Questions Audit

This audit checked whether the local Decision Making skills trainer questions that were not in `supabase/seed/dm_trainer_questions.json` were appropriate to seed to Supabase.

## Summary

Resolved: the full local DM bank is now seed-ready and exported to `supabase/seed/dm_trainer_questions.json`.

The previous blockers were:

- Each DM trainer had to be seedable in reviewed batches of 5, but the local counts were not divisible by 5.
- `data-decision-comparison-003` was duplicated in `src/data/dmTrainers/dataLogicQuestions.ts`.
- Because the seed script upserts by `id`, duplicated ids could overwrite/fail unexpectedly.

## Current Status

| Trainer | Local questions | Currently seeded | Unseeded | Individual question validation | Seed-ready as full bank? |
|---|---:|---:|---:|---|---|
| Venn Logic | 35 | 35 | 0 | Passes | Yes |
| Data Logic | 40 | 40 | 0 | Passes | Yes |
| Argument Judge | 40 | 40 | 0 | Passes | Yes |

Current validator result:

```text
All DM trainer seed questions passed validation.
```

## Questions Outside the Largest Complete Batch

There are no remaining overflow questions. Each trainer now has a count divisible by 5.

## Duplicate Id

Previously, `data-decision-comparison-003` appeared twice in `src/data/dmTrainers/dataLogicQuestions.ts`:

- Machine P vs Machine Q annual maintenance cost comparison
- Court A vs Court B rain/maintenance risk comparison

Both were plausible Data Logic questions. The Court A vs Court B item has been renamed to `data-decision-comparison-004`.

## Recommendation

The full local DM bank is appropriate to seed to Supabase.

Completed path:

1. Renamed one `data-decision-comparison-003` item to `data-decision-comparison-004`.
2. Added enough reviewed questions to reach multiples of 5.
3. Ran `npm run verify:dm-trainers`.
4. Regenerated `supabase/seed/dm_trainer_questions.json` with `npm run export:dm-trainers`.

The cleanest target counts would be:

| Trainer | Final local count | Seed status |
|---|---:|---|
| Venn Logic | 35 | Exported |
| Data Logic | 40 | Exported |
| Argument Judge | 40 | Exported |
