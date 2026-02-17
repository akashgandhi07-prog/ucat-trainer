/**
 * Lawyer mode: highlight qualifiers and absolutes for logic / argument analysis.
 * Uses word boundaries (\b) and case-insensitive (i) so "Many", "many," etc. are caught.
 */

const QUALIFIERS = ["some", "many", "often", "could"];
const ABSOLUTES = ["all", "never", "always", "must"];

const QUALIFIER_SET = new Set(QUALIFIERS.map((w) => w.toLowerCase()));
const ABSOLUTE_SET = new Set(ABSOLUTES.map((w) => w.toLowerCase()));

/** Regex for full-text scan: word boundaries and gi so "Many", "many," are matched */
const QUALIFIER_REGEX = /\b(some|many|often|could)\b/gi;
const ABSOLUTE_REGEX = /\b(all|never|always|must)\b/gi;

export type LawyerHighlight = "qualifier" | "absolute" | null;

export function getLawyerHighlight(word: string): LawyerHighlight {
  const normalized = word.toLowerCase().replace(/[^\w]/g, "");
  if (ABSOLUTE_SET.has(normalized)) return "absolute";
  if (QUALIFIER_SET.has(normalized)) return "qualifier";
  return null;
}

/**
 * Classes for Lawyer mode highlights. Uses underline + shape so qualifier vs absolute
 * are distinguishable for colorblind users (Deuteranopia): qualifier = dashed underline,
 * absolute = solid underline + bold. Avoid relying on red vs orange alone.
 */
export function getLawyerHighlightClass(highlight: LawyerHighlight): string {
  if (highlight === "qualifier") return "text-orange-500 underline decoration-dashed underline-offset-1";
  if (highlight === "absolute") return "text-red-600 font-bold underline underline-offset-1";
  return "";
}

/** Use when scanning full text for qualifiers/absolutes (e.g. Lawyer mode). */
export function getQualifierMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(QUALIFIER_REGEX)];
}

/** Use when scanning full text for absolutes. */
export function getAbsoluteMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(ABSOLUTE_REGEX)];
}
