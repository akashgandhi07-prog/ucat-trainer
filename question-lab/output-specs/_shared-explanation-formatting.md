# Shared: explanation formatting (all trainers)

Paste this block is included at the top of every trainer output spec. Follow it for every question you generate.

## Explanation formatting (required)

All student-facing text (`explanation`, `stem`, `question`, option text, `wrongOptionReasons`, SJT rationales) must follow these rules:

1. **Line breaks:** Put each major step on its own line. Separate steps with a blank line. In JSON use `\n\n` between steps. Never one long paragraph.
2. **No em dash or en dash:** Do not use U+2014 (`—`) or U+2013 (`–`). Use a colon, comma, full stop, or middle dot `·` instead.
   - Good: `Step 1: Name the regions`
   - Bad: `Step 1 — Name the regions` (em dash)
3. **DM numbered steps:** Use `Step 1:`, `Step 2:`, etc., each followed by `\n\n` before the next step.

Example `explanation` value in JSON:

`"Step 1: Name the regions...\n\nStep 2: State the equation...\n\nStep 5: Trap: students who chose B..."`

Question Lab import auto-fixes dashes and step line breaks when possible, but generate correctly first.

---
