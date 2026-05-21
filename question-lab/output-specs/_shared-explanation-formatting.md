# Shared: explanation formatting (all trainers)

Paste this block is included at the top of every trainer output spec. Follow it for every question you generate.

## Explanation formatting (required)

All student-facing text (`explanation`, `stem`, `question`, option text, `wrongOptionReasons`, SJT rationales) must follow these rules:

1. **Line breaks:** Each `Step N:` label must start on its own line. Put `\n\n` **before** Step 2, Step 3, and so on (never `...sentence. Step 2:` on one line). Put `\n\n` after each `Step N:` before that step's body. Never one long paragraph.
2. **No em dash or en dash:** Do not use U+2014 (`—`) or U+2013 (`–`). Use a colon, comma, full stop, or middle dot `·` instead.
   - Good: `Step 1: Name the regions`
   - Bad: `Step 1 — Name the regions` (em dash)
3. **DM numbered steps:** Use `Step 1:`, `Step 2:`, etc. Blank line before each step label (except Step 1 at the start) and blank line after each label before the working.

Example `explanation` value in JSON:

`"Step 1: Name the regions...\n\nStep 2: State the equation...\n\nStep 5: Trap: students who chose B..."`

Question Lab import auto-fixes dashes and step line breaks when possible, but generate correctly first.

---
