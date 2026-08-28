/**
 * Structural validation for the syllogism question bank.
 *
 * The bank lives in Supabase and has been edited by hand as well as by
 * `scripts/seedSyllogisms.ts`, so the invariants below are checked against the
 * stored rows rather than against generator output. They catch the defect class
 * reported by students in August 2026: a macro chain built from four term slots
 * where two slots held the same noun, which quietly turned an "invalid"
 * conclusion into a restatement of a premise (so the keyed answer was wrong).
 *
 * UK English in all messages.
 */

import { MEDICAL_NOUNS, NONSENSE_NOUNS, ABSTRACT_NOUNS } from "./SyllogismGenerator";

export type SyllogismRow = {
  id: string;
  question_mode: string | null;
  stimulus_text: string;
  conclusion_text: string;
  is_correct: boolean;
  trick_type: string | null;
};

export type SyllogismIssue = {
  questionId: string;
  message: string;
};

type Quantifier = "all" | "some" | "none" | "most" | "some_not" | "if";

/** A sentence reduced to its logical shape: quantifier plus the two noun slots. */
type Proposition = {
  quantifier: Quantifier;
  subject: string;
  predicate: string;
};

/** Every surface form (plural, singular, "a/an X") mapped to its noun key. */
function buildNounLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const entry of [...MEDICAL_NOUNS, ...NONSENSE_NOUNS, ...ABSTRACT_NOUNS]) {
    const key = entry.singular;
    lookup.set(entry.plural.toLowerCase(), key);
    lookup.set(entry.singular.toLowerCase(), key);
    lookup.set(entry.article.toLowerCase(), key);
  }
  return lookup;
}

const NOUN_LOOKUP = buildNounLookup();

function resolveNoun(phrase: string): string | null {
  const cleaned = phrase.trim().replace(/\.$/, "").toLowerCase();
  return NOUN_LOOKUP.get(cleaned) ?? NOUN_LOOKUP.get(cleaned.replace(/^the /, "")) ?? null;
}

/**
 * Sentence templates, mirroring the builders in SyllogismGenerator. Order
 * matters only in that every pattern is anchored, so no sentence matches twice.
 */
const PATTERNS: [RegExp, Quantifier][] = [
  [/^All (.+?) are not (.+)$/i, "some_not"],
  [/^All (.+?) are (.+)$/i, "all"],
  [/^Every single (.+?) is (.+)$/i, "all"],
  [/^Any (.+?) must be (.+)$/i, "all"],
  [/^Each (.+?) is classified as (.+)$/i, "all"],
  [/^If it is (.+?), then it is (.+)$/i, "if"],
  [/^Anything that is (.+?) is also (.+)$/i, "if"],
  [/^Being (.+?) guarantees it is (.+)$/i, "if"],
  [/^Some (.+?) are not (.+)$/i, "some_not"],
  [/^Some (.+?) are also (.+)$/i, "some"],
  [/^Some (.+?) are (.+)$/i, "some"],
  [/^A few (.+?) are (.+)$/i, "some"],
  [/^At least one (.+?) is (.+)$/i, "some"],
  [/^Certain (.+?) are also (.+)$/i, "some"],
  [/^No (.+?) are (.+)$/i, "none"],
  [/^None of the (.+?) are (.+)$/i, "none"],
  [/^Not a single (.+?) is (.+)$/i, "none"],
  [/^Most (.+?) are (.+)$/i, "most"],
  [/^The majority of (.+?) are (.+)$/i, "most"],
  [/^More than half of the (.+?) are (.+)$/i, "most"],
];

export function parseProposition(sentence: string): Proposition | null {
  const text = sentence.trim().replace(/\.$/, "");
  for (const [pattern, quantifier] of PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const subject = resolveNoun(match[1]);
    const predicate = resolveNoun(match[2]);
    if (!subject || !predicate) return null;
    return { quantifier, subject, predicate };
  }
  return null;
}

export function splitStimulus(stimulus: string): string[] {
  return stimulus
    .trim()
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function describe(proposition: Proposition): string {
  return `${proposition.quantifier}(${proposition.subject} → ${proposition.predicate})`;
}

function samePropositions(a: Proposition, b: Proposition): boolean {
  return a.quantifier === b.quantifier && a.subject === b.subject && a.predicate === b.predicate;
}

/** Expected conclusion shape for each macro trick type, in A/B/C/D slot terms. */
const MACRO_EXPECTATIONS: Record<
  string,
  { quantifier: Quantifier; subject: "A" | "B" | "C" | "D"; predicate: "A" | "B" | "C" | "D"; isCorrect: boolean }
> = {
  macro_chain_AB_valid: { quantifier: "all", subject: "A", predicate: "B", isCorrect: true },
  macro_chain_BC_valid: { quantifier: "some", subject: "B", predicate: "C", isCorrect: true },
  macro_chain_AC_false_overlap: { quantifier: "some", subject: "A", predicate: "C", isCorrect: false },
  macro_chain_CD_valid: { quantifier: "most", subject: "C", predicate: "D", isCorrect: true },
  macro_chain_global_reverse_trap: { quantifier: "all", subject: "A", predicate: "D", isCorrect: false },
};

function validateMacroRow(row: SyllogismRow, issues: SyllogismIssue[]): void {
  const sentences = splitStimulus(row.stimulus_text);
  if (sentences.length !== 3) {
    issues.push({ questionId: row.id, message: `macro stimulus has ${sentences.length} sentences, expected 3` });
    return;
  }

  const premises = sentences.map(parseProposition);
  const unparsed = premises.findIndex((premise) => premise === null);
  if (unparsed >= 0) {
    issues.push({ questionId: row.id, message: `cannot parse premise ${unparsed + 1}: "${sentences[unparsed]}"` });
    return;
  }
  const [first, second, third] = premises as Proposition[];

  if (first.quantifier !== "all" || second.quantifier !== "some" || third.quantifier !== "most") {
    issues.push({
      questionId: row.id,
      message: `macro chain should read all/some/most, found ${first.quantifier}/${second.quantifier}/${third.quantifier}`,
    });
    return;
  }

  const slots = { A: first.subject, B: first.predicate, C: second.predicate, D: third.predicate };

  if (second.subject !== slots.B) {
    issues.push({ questionId: row.id, message: `chain break: premise 2 starts from "${second.subject}", expected B = "${slots.B}"` });
  }
  if (third.subject !== slots.C) {
    issues.push({ questionId: row.id, message: `chain break: premise 3 starts from "${third.subject}", expected C = "${slots.C}"` });
  }

  const distinct = new Set(Object.values(slots));
  if (distinct.size !== 4) {
    // The August 2026 defect: a repeated slot makes at least one keyed answer wrong.
    issues.push({
      questionId: row.id,
      message: `macro chain reuses a term: A="${slots.A}" B="${slots.B}" C="${slots.C}" D="${slots.D}"`,
    });
  }

  const conclusion = parseProposition(row.conclusion_text);
  if (!conclusion) {
    issues.push({ questionId: row.id, message: `cannot parse conclusion: "${row.conclusion_text}"` });
    return;
  }

  // The two hand-written blocks from the foundations migrations use macro1_/macro2_
  // prefixes for the same five conclusion roles.
  const trickType = (row.trick_type ?? "").replace(/^macro[12]_/, "macro_chain_");
  const expectation = MACRO_EXPECTATIONS[trickType];
  if (!expectation) {
    issues.push({ questionId: row.id, message: `unknown macro trick_type "${row.trick_type}"` });
    return;
  }

  const expected: Proposition = {
    quantifier: expectation.quantifier,
    subject: slots[expectation.subject],
    predicate: slots[expectation.predicate],
  };
  if (!samePropositions(conclusion, expected)) {
    issues.push({
      questionId: row.id,
      message: `conclusion ${describe(conclusion)} does not match ${trickType}, which expects ${describe(expected)}`,
    });
  }
  if (row.is_correct !== expectation.isCorrect) {
    issues.push({
      questionId: row.id,
      message: `is_correct is ${row.is_correct} but ${trickType} must be ${expectation.isCorrect}`,
    });
  }
}

function validateSharedRules(row: SyllogismRow, issues: SyllogismIssue[]): void {
  const sentences = splitStimulus(row.stimulus_text);
  const premises = sentences.map(parseProposition).filter((p): p is Proposition => p !== null);

  for (const premise of premises) {
    if (premise.subject === premise.predicate) {
      issues.push({ questionId: row.id, message: `premise says a term is itself: ${describe(premise)}` });
    }
  }

  const conclusion = parseProposition(row.conclusion_text);
  if (!conclusion) return;

  if (conclusion.subject === conclusion.predicate && !row.is_correct) {
    issues.push({ questionId: row.id, message: `conclusion is a tautology but keyed invalid: ${describe(conclusion)}` });
  }
  // A conclusion that simply restates a premise cannot be invalid.
  if (!row.is_correct && premises.some((premise) => samePropositions(premise, conclusion))) {
    issues.push({ questionId: row.id, message: `conclusion restates a premise but is keyed invalid: ${describe(conclusion)}` });
  }
}

export function validateSyllogismQuestions(rows: SyllogismRow[]): SyllogismIssue[] {
  const issues: SyllogismIssue[] = [];
  for (const row of rows) {
    validateSharedRules(row, issues);
    if (row.question_mode === "macro") validateMacroRow(row, issues);
  }
  return issues;
}
