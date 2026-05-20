# QR Conversions — Output format

## What This Trainer Teaches

Students learn to convert between units accurately and quickly. The core skill is knowing which direction to convert, applying the conversion factor correctly, and avoiding the most common errors: reversing the operation, mixing units mid-calculation, and rounding at the wrong step.

## Skills The AI Should Cover

- Single-step conversions: km to miles, kg to lbs, litres to pints, £ to $, cm to inches, etc.
- Multi-step conversions: e.g. miles per hour to metres per second
- Rate conversions: price per unit in one currency/unit to another
- Scaling conversions: recipe scaling, map distance, fuel efficiency
- Percentage and proportion conversions: e.g. converting a fraction to a percentage of a different base

Aim for roughly: 40% single-step, 35% multi-step or rate, 25% applied context (recipe, map, price list).
Difficulty split: 30% easy (straightforward single conversion), 50% medium (two steps or awkward numbers), 20% hard (three steps or compound conversion).

## Our Explanation Style

Do NOT just give the answer. The explanation must show the full conversion working.

Good explanation structure:
1. State the conversion factor being used (write it out explicitly)
2. Show the calculation with units attached at every step (unit cancellation)
3. State the answer with correct units
4. Name the trap (e.g. "Students who divided instead of multiplied arrived at option A")

Show the direction of conversion clearly: write "× 1.6" not just "multiply". Students who choose wrong distractors almost always used the conversion factor in the wrong direction or forgot a step.

The tone is methodical. Every step should be visible. No mental arithmetic shortcuts in the explanation — write it all out.

## Common Traps To Build Into Distractors

- Reversing the conversion (divide instead of multiply or vice versa)
- Using the wrong conversion factor (e.g. 1 mile = 1.6 km confused with 1 km = 1.6 miles)
- Stopping one step too early in a multi-step conversion
- Rounding at an intermediate step causing the final answer to differ
- Correct calculation but wrong units in the answer

Each question should have at least one distractor that reflects a realistic conversion error, not just a random wrong number.


## Storage contract (product)

On import, each question becomes a `trainer_questions` row with `trainer_type` `qr-conversions`. `stem` holds the prompt; `explanation` holds a short summary (usually `explanation.examShortcut`). Full teaching lives in `content.explanation`. Students load active rows via `get_qr_conversion_drill()`.

## JSON output (one question)

Return a JSON array:

```json
{
  "id": "conv-metric-length-001",
  "category": "Metric length",
  "prompt": "Convert 3.6 km to metres.",
  "answer": 3600,
  "answerLabel": "3,600 m",
  "explanation": {
    "method": {
      "target": "Convert km to m",
      "convert": "× 1000 (km to m)",
      "calculate": "3.6 × 1000 = 3600 m"
    },
    "examShortcut": "3.6 km = 3600 m",
    "senseCheck": "Metres are smaller than km, so the number should increase",
    "commonTrap": "multiplied-instead-of-divided"
  }
}
```

`category` must match a conversion category in the app (e.g. `Metric length`, `Imperial length`, `Time`, `Speed`).
