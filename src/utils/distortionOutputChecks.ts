/**
 * Grammatical sanity checks for generated distortion statements.
 *
 * The speed reading / rapid recall trainer builds its statements by mutating
 * passage sentences, so a bad rule shows up as text no student can parse rather
 * than as a crash. Every report students have filed against this trainer has
 * been of that kind ("only all makes zero sense", "where they matter all makes
 * no sense linguistically"), so the rules below encode the shapes we have had
 * to fix. `npm run verify:distortion` runs them over every passage.
 *
 * UK English in all messages.
 */

import { articleFor } from "./distortionEngine";

export type OutputProblem = {
  rule: string;
  statement: string;
};

const RULES: [string, RegExp][] = [
  // A restrictive adverb followed by a broadened quantifier: "only all clauses".
  ["restrictive adverb before a universal", /\b(only|just|merely|barely|solely)\s+(all|always|every|universal)\b/i],
  // A quantifier stranded after the noun it was meant to modify: "where they matter all".
  ["stranded quantifier after a verb", /\b(matter|matters|mattered|count|counts|apply|applies)\s+(all|always)\b/i],
  // Article plus quantifier: "an all", "the always".
  ["article before a quantifier", /\b(the|an?)\s+(all|always|every single)\b/i],
  // A determiner followed by a verb-only word: "the central argue", "an give".
  [
    "verb where a noun belongs",
    /\b(the|a|an|its|their|his|her|our|your|my)\s+((central|core|main|primary|key|basic|general|overall|underlying|initial|final|broad|common|strong|principal|particular|further|additional)\s+)?(argue|argues|maintain|maintains|contend|contends|assert|asserts|endorse|endorses|uphold|upholds|oppose|opposes|give|gives)\b/i,
  ],
  // Two quantifiers in a row: "all most", "some all".
  ["stacked quantifiers", /\b(all|most|some|every|always)\s+(all|most|always)\b/i],
  // Negation left dangling by a removed word: "not all at all" style stranding.
  ["doubled negation particle", /\bnot\s+not\b|\bnever\s+never\b/i],
  // Leftover punctuation or spacing damage.
  ["punctuation damage", /,\s*,|\s{2,}|\s+\.$/],
  // A sentence that no longer starts with a capital letter.
  ["lowercase sentence start", /^[a-z]/],
];

/** "a" / "an" disagreement, judged by the same rule the engine corrects with. */
function hasArticleDisagreement(statement: string): boolean {
  const pattern = /\b(a|an)\s+([A-Za-z][A-Za-z'-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(statement)) !== null) {
    const correct = articleFor(match[2]);
    if (correct && correct !== match[1].toLowerCase()) return true;
  }
  return false;
}

export function checkStatement(statement: string): OutputProblem[] {
  const problems: OutputProblem[] = [];
  const trimmed = statement.trim();
  for (const [rule, pattern] of RULES) {
    if (pattern.test(trimmed)) problems.push({ rule, statement });
  }
  if (hasArticleDisagreement(trimmed)) problems.push({ rule: "indefinite article disagreement", statement });
  return problems;
}
