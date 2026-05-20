# DM Data Logic — Output format

## What This Trainer Teaches

Students learn to read structured data (tables, charts, written statistics) and draw valid conclusions. The core skill is identifying the right values, performing the right operation, and avoiding common denominator and unit errors — all under time pressure.

## Skills The AI Should Cover

- Percentage change: (new − old) / old × 100
- Proportion/fraction of a total
- Comparing across categories or time periods
- Identifying the highest, lowest, or closest value
- Two-step calculations: e.g. find a total then take a percentage
- Reading written data tables (text-based, no image required)

Aim for roughly: 40% percentage/ratio questions, 30% comparison questions, 30% multi-step calculations.
Difficulty split: 25% easy, 50% medium, 25% hard.

## Note On Images

Bar charts, line charts, and pie charts cannot be generated automatically yet. Until image generation is available via OpenRouter, write all Data Logic questions using text-based data tables or written statistics only. Structure data clearly with plain text tables using markdown formatting. Do not require a visual chart to answer the question.

Example of acceptable data format:

| Year | Sales (£000s) |
|------|--------------|
| 2020 | 120 |
| 2021 | 145 |
| 2022 | 138 |

When image generation becomes available, chart-based questions will be added.

## Our Explanation Style

Do NOT just give the answer. The explanation must identify the exact operation and show the working.

Good explanation structure:
1. Identify which values from the data are needed
2. Name the operation (percentage change, ratio, proportion, etc.)
3. Show the calculation with actual numbers substituted
4. State the answer
5. Name the trap (e.g. "Students who used 145 as the denominator instead of 120 chose C")

The tone is teaching, not marking. Show the method so students can apply it to any data question.

Official UCAT explanations often only confirm the answer. Our explanations show why the method works and why each distractor fails.


## Storage contract (product)

On import, each question becomes a `trainer_questions` row. `stem` and `explanation` are top-level columns; everything else below goes in `content` JSONB. Import builds `optionsList` from your `options` array. Students see active rows via `get_dm_trainer_drill('data-logic')` including `generalRule`, `wrongOptionReasons`, `keyInsight`, and `review`.

## JSON output (one question)

Return a JSON array. Each object:

```json
{
  "id": "data-pct-change-001",
  "trainerType": "data-logic",
  "difficulty": "medium",
  "skillTag": "percentage-change",
  "stem": "Scenario with a text table",
  "question": "What was the percentage change from 2020 to 2021?",
  "options": [
    {"id": "A", "text": "..."},
    {"id": "B", "text": "..."},
    {"id": "C", "text": "..."},
    {"id": "D", "text": "..."}
  ],
  "correctAnswer": "B",
  "explanation": "Identify values, show calculation, eliminate distractors",
  "commonTrap": "wrong-denominator",
  "generalRule": "Percentage change = (new − old) / old × 100",
  "wrongOptionReasons": {"A": "...", "B": "Correct.", "C": "...", "D": "..."},
  "keyInsight": "Always use the original value as the denominator",
  "review": {
    "ambiguityRisk": "low",
    "whySafeToInclude": "Single correct operation; each wrong option from a named error"
  }
}
```

Use `trainerType` `"data-logic"` for every question in this file.
