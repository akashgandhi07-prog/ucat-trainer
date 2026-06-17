/**
 * Human-readable copy for the `commonTrap` slugs carried by question explanations.
 *
 * Both the Mental Maths and Conversions trainers tag each question with a kebab-case
 * trap id; this map turns those ids into a sentence shown to the student in the review
 * panel. Keep every slug used by either trainer in here so nothing leaks the raw id.
 */
export const COMMON_TRAP_COPY: Record<string, string> = {
  // ── Conversions ──────────────────────────────────────────────────────────
  "answer-unit-mismatch": "Doing the calculation correctly but leaving the answer in the wrong unit.",
  "decimal-hours-read-as-minutes": "Treating a decimal number of hours as if the decimal part were minutes.",
  "decimal-minutes-read-as-seconds": "Treating a decimal number of minutes as if the decimal part were seconds.",
  "divided-instead-of-multiplied": "Dividing when the conversion needs multiplication, usually when moving to a smaller unit.",
  "linear-conversion-used-for-area": "Using the length conversion for an area conversion instead of squaring the conversion factor.",
  "minutes-used-as-hours": "Using minutes directly in a speed formula instead of converting them to hours first.",
  "multiplied-instead-of-divided": "Multiplying when the conversion needs division, usually when moving to a larger unit.",
  "pence-pounds-confusion": "Mixing pence and pounds, especially forgetting that 100p equals £1.",
  "per-unit-rate-multiplied-by-wrong-unit": "Applying a per-unit rate to the wrong unit or before checking the units match.",
  "rounded-too-early": "Rounding during the working instead of keeping the calculator value until the final answer.",
  "rounded-up-when-full-servings-required": "Rounding up when the question asks for complete portions only.",
  "speed-unit-conversion-reversed": "Reversing the km/h and m/s conversion, especially using ×3.6 and ÷3.6 the wrong way round.",
  "unnecessary-factor-of-1000": "Adding an unnecessary ×1000 or ÷1000 when the units are already equivalent.",
  "volume-unit-mismatch": "Confusing volume units such as litres, millilitres and cubic centimetres.",
  "wrong-denominator": "Using the wrong denominator for a rate, such as treating a per 100 value as a per 1 value.",

  // ── Mental Maths ─────────────────────────────────────────────────────────
  "single-digit-times-table-slip": "Misremembering a times-table fact under time pressure — double-check the awkward ones (7s, 8s).",
  "fraction-percentage-pair-confusion": "Mixing up the common fraction–percentage pairs, e.g. reading 1/4 as 40% instead of 25%.",
  "percent-not-divided-by-100": "Forgetting that a percentage is out of 100 when turning it into a decimal.",
  "percent-not-converted-to-decimal": "Multiplying by the whole percentage instead of dividing by 100 first.",
  "square-times-two-instead-of-times-itself": "Doubling a number instead of multiplying it by itself when squaring.",
  "chunked-multiplication-place-value-error": "Losing track of place value when splitting a number into tens and units.",
  "over-calculating-an-estimate": "Doing exact long multiplication when the question only asks for an estimate.",
  "exact-calculation-when-estimate-asked": "Working out the exact figure when rounding first would have been faster and accurate enough.",
  "subtracted-percentage-not-price": "Subtracting the percentage figure itself instead of the money it represents.",

  // ── Decision Making: Argument Judge ──────────────────────────────────────
  "true-but-irrelevant": "Picking an option that is true and sounds sensible but does not address the exact aim stated in the question.",
  "only-addresses-one-criterion": "Choosing an option that satisfies just one of the criteria the stem lists, when the strongest argument must cover them all.",
  "too-narrow": "Selecting an option that is correct only for a small slice of the situation, not the whole aim.",
  "partial-objection": "Treating an objection that defeats only part of the argument as if it defeats the whole thing.",
  "unsupported-assumption": "Backing an option that relies on a claim the passage never establishes.",
  "unsupported-absolute": "Falling for an absolute claim (always, never, all, none) that the evidence does not justify.",
  "ignores-target-group": "Choosing an argument that ignores the specific group the question is about.",
  "same-topic-wrong-aim": "Picking an option on the right topic but aimed at a different goal than the stem asks for.",

  // ── Decision Making: Data & probability ──────────────────────────────────
  "raw-number-treated-as-percentage": "Reading a raw count as if it were already a percentage instead of converting it first.",
  "complement-error": "Forgetting that two exhaustive outcomes sum to 100% — the answer is 100% minus the given value.",
  "adds-probabilities-incorrectly": "Adding probabilities for 'at least one' instead of using 1 − P(none), which over-counts.",
  "same-probability-each-turn": "Assuming equal turns mean equal chances, ignoring that the first player gets the first attempt.",
  "applies-second-percent-to-total": "Applying a second percentage to the original total instead of to the new (already-changed) value.",

  // ── Decision Making: Venn / set logic ────────────────────────────────────
  "includes-all-three-incorrectly": "Letting the all-three overlap leak into an 'exactly two' count — it must be excluded.",
  "confuses-exactly-and-at-least": "Mixing up 'exactly two' (the pairwise regions only) with 'at least two' (which includes all three).",
  "assumes-no-overlap": "Assuming sets do not overlap when the wording leaves the overlap unknown.",
  "double-counts-pair-overlap": "Counting people in a shared overlap region twice when totalling the sets.",
  "misinterprets-not-a": "Reading 'not A' as a different region than the wording requires (e.g. confusing it with 'neither').",
};

export function getCommonTrapCopy(trap: string): string {
  return COMMON_TRAP_COPY[trap] ?? trap.replace(/-/g, " ");
}
