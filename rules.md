# UK copy and UI standards

Project-wide rules for user-facing text and layout. Cursor agents load `.cursor/rules/rules.mdc` automatically; this file is the human-readable mirror.

## Language

- **UK English** spelling and conventions throughout.
- Plain, direct sentences aimed at UCAT students.

## No em dash or en dash

Do not use `—` (em dash) or `–` (en dash) anywhere in UI copy, marketing strings, or PDF/export text.

**Replacements:**

- Clause break: comma, full stop, or colon
- Ranges (time): `to` (e.g. `09:00 to 16:00 UK`)
- Compact meta lines: middle dot `·` (already used in the app)
- Price + offer: parentheses or comma (e.g. `one live day (£179)`)

Hyphens in compound words (`1-day`, `brand-new`) are fine.

## Clear UI/UX

- Short headings; one primary action per card or strip.
- Verb-first CTAs; match existing components (`ProductUpsell`, guides panels, sidebars).
- Reuse design tokens (spacing, `text-muted-foreground`, borders) rather than one-off styles.
- Upsells: eyebrow → headline → one line of proof → CTA.

## Checklist

- [ ] No `—` or `–` in touched files
- [ ] UK spelling
- [ ] Readable on mobile without wrapping awkwardly
