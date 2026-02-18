/**
 * Procedural syllogism question generator for seed data.
 * Produces JSON suitable for seeding public.syllogism_questions (e.g. via a Node script).
 * UK English in all generated text and comments.
 */

import type { SyllogismQuestion } from "../types/syllogisms";

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `gen-${Math.random().toString(36).slice(2, 11)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Linguistic variation: phrasing templates (UK English)
// ─────────────────────────────────────────────────────────────────────────────

type NounPair = (subject: NounEntry, predicate: NounEntry) => string;

const CATEGORICAL_ALL_TEMPLATES: NounPair[] = [
  (s, p) => `All ${s.plural} are ${p.plural}.`,
  (s, p) => `Every single ${s.singular} is ${p.article}.`,
  (s, p) => `Any ${s.singular} must be ${p.article}.`,
  (s, p) => `Each ${s.singular} is classified as ${p.article}.`,
];

const RELATIVE_SOME_TEMPLATES: NounPair[] = [
  (s, p) => `Some ${s.plural} are ${p.plural}.`,
  (s, p) => `A few ${s.plural} are ${p.plural}.`,
  (s, p) => `At least one ${s.singular} is ${p.article}.`,
  (s, p) => `Certain ${s.plural} are also ${p.plural}.`,
];

const CATEGORICAL_NONE_TEMPLATES: NounPair[] = [
  (s, p) => `No ${s.plural} are ${p.plural}.`,
  (s, p) => `None of the ${s.plural} are ${p.plural}.`,
  (s, p) => `Not a single ${s.singular} is ${p.article}.`,
];

const MAJORITY_MOST_TEMPLATES: NounPair[] = [
  (s, p) => `Most ${s.plural} are ${p.plural}.`,
  (s, p) => `The majority of ${s.plural} are ${p.plural}.`,
  (s, p) => `More than half of the ${s.plural} are ${p.plural}.`,
];

const COMPLEX_IF_TEMPLATES: NounPair[] = [
  (s, p) => `If it is ${s.article}, then it is ${p.article}.`,
  (s, p) => `Anything that is ${s.article} is also ${p.article}.`,
  (s, p) => `Being ${s.article} guarantees it is ${p.article}.`,
];

function buildCategoricalAllSentence(subject: NounEntry, predicate: NounEntry): string {
  return pick(CATEGORICAL_ALL_TEMPLATES)(subject, predicate);
}
function buildRelativeSomeSentence(subject: NounEntry, predicate: NounEntry): string {
  return pick(RELATIVE_SOME_TEMPLATES)(subject, predicate);
}
function buildCategoricalNoneSentence(subject: NounEntry, predicate: NounEntry): string {
  return pick(CATEGORICAL_NONE_TEMPLATES)(subject, predicate);
}
function buildMajorityMostSentence(subject: NounEntry, predicate: NounEntry): string {
  return pick(MAJORITY_MOST_TEMPLATES)(subject, predicate);
}
function buildComplexIfSentence(subject: NounEntry, predicate: NounEntry): string {
  return pick(COMPLEX_IF_TEMPLATES)(subject, predicate);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grammar-aware noun dictionaries
// ─────────────────────────────────────────────────────────────────────────────

export interface NounEntry {
  singular: string;
  plural: string;
  article: string;
}

export const MEDICAL_NOUNS: NounEntry[] = [
  { singular: "doctor", plural: "doctors", article: "a doctor" },
  { singular: "surgeon", plural: "surgeons", article: "a surgeon" },
  { singular: "hospital staff member", plural: "hospital staff", article: "a hospital staff member" },
  { singular: "graduate", plural: "graduates", article: "a graduate" },
  { singular: "manager", plural: "managers", article: "a manager" },
  { singular: "consultant", plural: "consultants", article: "a consultant" },
  { singular: "nurse", plural: "nurses", article: "a nurse" },
  { singular: "pharmacist", plural: "pharmacists", article: "a pharmacist" },
  { singular: "registrar", plural: "registrars", article: "a registrar" },
  { singular: "specialist", plural: "specialists", article: "a specialist" },
  { singular: "therapist", plural: "therapists", article: "a therapist" },
  { singular: "clinician", plural: "clinicians", article: "a clinician" },
  { singular: "patient", plural: "patients", article: "a patient" },
  { singular: "technician", plural: "technicians", article: "a technician" },
  { singular: "administrator", plural: "administrators", article: "an administrator" },
];

export const NONSENSE_NOUNS: NounEntry[] = [
  { singular: "florb", plural: "florbs", article: "a florb" },
  { singular: "zump", plural: "zumps", article: "a zump" },
  { singular: "kenek", plural: "keneks", article: "a kenek" },
  { singular: "larrick", plural: "larricks", article: "a larrick" },
  { singular: "yittle", plural: "yittles", article: "a yittle" },
  { singular: "vrelk", plural: "vrelks", article: "a vrelk" },
  { singular: "moxen", plural: "moxens", article: "a moxen" },
  { singular: "tindar", plural: "tindars", article: "a tindar" },
  { singular: "quib", plural: "quibs", article: "a quib" },
  { singular: "sarn", plural: "sarns", article: "a sarn" },
  { singular: "wolix", plural: "wolixes", article: "a wolix" },
  { singular: "brev", plural: "brevs", article: "a brev" },
  { singular: "nockle", plural: "nockles", article: "a nockle" },
  { singular: "trelb", plural: "trelbs", article: "a trelb" },
  { singular: "zarn", plural: "zarns", article: "a zarn" },
];

export const ABSTRACT_NOUNS: NounEntry[] = [
  { singular: "person who likes coffee", plural: "people who like coffee", article: "a person who likes coffee" },
  { singular: "person afraid of heights", plural: "people afraid of heights", article: "a person afraid of heights" },
  { singular: "early riser", plural: "early risers", article: "an early riser" },
  { singular: "night owl", plural: "night owls", article: "a night owl" },
  { singular: "left-hander", plural: "left-handers", article: "a left-hander" },
  { singular: "vegetarian", plural: "vegetarians", article: "a vegetarian" },
  { singular: "commuter", plural: "commuters", article: "a commuter" },
  { singular: "remote worker", plural: "remote workers", article: "a remote worker" },
  { singular: "dog owner", plural: "dog owners", article: "a dog owner" },
  { singular: "cat owner", plural: "cat owners", article: "a cat owner" },
  { singular: "cyclist", plural: "cyclists", article: "a cyclist" },
  { singular: "reader", plural: "readers", article: "a reader" },
  { singular: "gamer", plural: "gamers", article: "a gamer" },
  { singular: "music lover", plural: "music lovers", article: "a music lover" },
  { singular: "introvert", plural: "introverts", article: "an introvert" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Logic blueprints (return questions with shared stimulus where applicable)
// ─────────────────────────────────────────────────────────────────────────────

type NounSet = { x: NounEntry; y: NounEntry; z: NounEntry };

function pickNounSet(): NounSet {
  const pools = [MEDICAL_NOUNS, NONSENSE_NOUNS, ABSTRACT_NOUNS];
  const x = pick(pick(pools));
  let y = pick(pick(pools));
  let z = pick(pick(pools));
  while (y.singular === x.singular) y = pick(pick(pools));
  while (z.singular === x.singular || z.singular === y.singular) z = pick(pick(pools));
  return { x, y, z };
}

/** Four distinct nouns from the same dictionary for macro chain (A, B, C, D). */
function pickNounQuadFromSamePool(): {
  A: NounEntry;
  B: NounEntry;
  C: NounEntry;
  D: NounEntry;
} {
  const pool = pick([MEDICAL_NOUNS, NONSENSE_NOUNS, ABSTRACT_NOUNS]);
  const shuffled = shuffle([...pool]);
  if (shuffled.length < 4) {
    const extra = pick([MEDICAL_NOUNS, NONSENSE_NOUNS, ABSTRACT_NOUNS].flat());
    while (shuffled.length < 4) shuffled.push(extra);
  }
  return {
    A: shuffled[0],
    B: shuffled[1],
    C: shuffled[2],
    D: shuffled[3],
  };
}

/** Build one macro block: three-sentence chain (A–B categorical, B–C relative, C–D majority) and five conclusions. */
function buildMacroChainBlock(
  _blockId: string // reserved for future block id
): Omit<SyllogismQuestion, "id" | "macro_block_id">[] {
  void _blockId;
  const { A, B, C, D } = pickNounQuadFromSamePool();
  const sent1 = buildCategoricalAllSentence(A, B);
  const sent2 = buildRelativeSomeSentence(B, C);
  const sent3 = buildMajorityMostSentence(C, D);
  const stimulus = `${sent1} ${sent2} ${sent3}`;

  return [
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(A, B).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "categorical",
      trick_type: "macro_chain_AB_valid",
      explanation: `Valid: the first sentence states that all A are B; this restates that link.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildRelativeSomeSentence(B, C).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "relative",
      trick_type: "macro_chain_BC_valid",
      explanation: `Valid: the second sentence states that some B are C; this restates that link.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildRelativeSomeSentence(A, C).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "relative",
      trick_type: "macro_chain_AC_false_overlap",
      explanation: `Invalid: we know all A are B and some B are C, but that does not force some A to be C; the overlap of B and C might not include any A.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildMajorityMostSentence(C, D).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "majority",
      trick_type: "macro_chain_CD_valid",
      explanation: `Valid: the third sentence states that most C are D; this restates that link.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(A, D).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "complex",
      trick_type: "macro_chain_global_reverse_trap",
      explanation: `Invalid: we cannot chain "all A are B", "some B are C", and "most C are D" to conclude "all A are D"; the links are too weak (some/most) to support a universal conclusion.`,
    },
  ];
}

/** Categorical chain: All X are Y. All Y are Z. */
function buildCategoricalChain(
  _blockId: string,
  n: NounSet
): { stimulus: string; questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] } {
  const s1 = buildCategoricalAllSentence(n.x, n.y);
  const s2 = buildCategoricalAllSentence(n.y, n.z);
  const stimulus = `${s1} ${s2}`;
  const questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] = [
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(n.x, n.z).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "categorical",
      trick_type: "categorical_chain_valid",
      explanation: `Valid: from the first two sentences we can conclude all X are Z.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildRelativeSomeSentence(n.z, n.x).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "categorical",
      trick_type: "categorical_chain_some",
      explanation: `Valid: if all X are Z, then there are X who are Z, so some Z are X.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(n.z, n.x).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "categorical",
      trick_type: "categorical_chain_converse_trap",
      explanation: `Invalid: we only know all X are Z, not that all Z are X.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalNoneSentence(n.x, n.z).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "categorical",
      trick_type: "categorical_chain_negation",
      explanation: `Invalid: the premises imply all X are Z, so "No X are Z" contradicts them.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `Some ${n.x.plural} are not ${n.z.plural}.`,
      is_correct: false,
      logic_group: "categorical",
      trick_type: "categorical_chain_some_not",
      explanation: `Invalid: from "All X are Z" we cannot have any X that are not Z.`,
    },
  ];
  return { stimulus, questions };
}

/** Relative overlap: All X are Y. Some Z are Y. */
function buildRelativeOverlap(
  _blockId: string,
  n: NounSet
): { stimulus: string; questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] } {
  const s1 = buildCategoricalAllSentence(n.x, n.y);
  const s2 = buildRelativeSomeSentence(n.z, n.y);
  const stimulus = `${s1} ${s2}`;
  const questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] = [
    {
      stimulus_text: stimulus,
      conclusion_text: buildRelativeSomeSentence(n.y, n.z).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "relative",
      trick_type: "relative_overlap_valid",
      explanation: `Valid: "Some Z are Y" is equivalent to "Some Y are Z".`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `It is possible that some ${n.x.plural} are ${n.z.plural}.`,
      is_correct: true,
      logic_group: "relative",
      trick_type: "relative_possible_overlap",
      explanation: `Valid: we are not told X and Z are disjoint; overlap is possible.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(n.z, n.y).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "relative",
      trick_type: "relative_all_trap",
      explanation: `Invalid: we only know some Z are Y, not all.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalNoneSentence(n.x, n.z).replace(/\.$/, ""),
      is_correct: false,
      logic_group: "relative",
      trick_type: "relative_no_overlap_trap",
      explanation: `Invalid: the premises do not establish that X and Z never overlap.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `Some ${n.x.plural} are ${n.z.plural}.`,
      is_correct: false,
      logic_group: "relative",
      trick_type: "relative_some_xy_trap",
      explanation: `Invalid: we know some Z are Y and all X are Y, but that does not force some X to be Z.`,
    },
  ];
  return { stimulus, questions };
}

/** Majority intersect: Most X are Y. Most X are Z. */
function buildMajorityIntersect(
  _blockId: string,
  n: NounSet
): { stimulus: string; questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] } {
  const s1 = buildMajorityMostSentence(n.x, n.y);
  const s2 = buildMajorityMostSentence(n.x, n.z);
  const stimulus = `${s1} ${s2}`;
  const questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] = [
    {
      stimulus_text: stimulus,
      conclusion_text: `At least some ${n.x.plural} are both ${n.y.plural} and ${n.z.plural}.`,
      is_correct: true,
      logic_group: "majority",
      trick_type: "majority_overlap_valid",
      explanation: `Valid: if most X are Y and most X are Z, the two majorities must overlap.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `It is possible that no ${n.x.plural} are both ${n.y.plural} and ${n.z.plural}.`,
      is_correct: false,
      logic_group: "majority",
      trick_type: "majority_no_overlap_trap",
      explanation: `Invalid: with "most" each way, overlap is necessary, not merely possible to avoid.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `All ${n.x.plural} are ${n.y.plural}.`,
      is_correct: false,
      logic_group: "majority",
      trick_type: "majority_all_trap",
      explanation: `Invalid: "most" does not mean "all".`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildMajorityMostSentence(n.x, n.y).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "majority",
      trick_type: "majority_restate",
      explanation: `Valid: this restates the first premise.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `Every ${n.x.singular} is either ${n.y.singular} or ${n.z.singular}.`,
      is_correct: false,
      logic_group: "majority",
      trick_type: "majority_exhaustive_trap",
      explanation: `Invalid: "most" does not imply that every X is in Y or Z; some could be neither.`,
    },
  ];
  return { stimulus, questions };
}

/** Complex link: If it is an X, then it is a Y. */
function buildComplexLink(
  _blockId: string,
  n: NounSet
): { stimulus: string; questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] } {
  const stimulus = buildComplexIfSentence(n.x, n.y);
  const questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] = [
    {
      stimulus_text: stimulus,
      conclusion_text: `If it is not ${n.y.singular}, then it is not ${n.x.singular}.`,
      is_correct: true,
      logic_group: "complex",
      trick_type: "complex_contrapositive",
      explanation: `Valid: this is the contrapositive of the conditional.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `If it is ${n.y.article}, then it is ${n.x.article}.`,
      is_correct: false,
      logic_group: "complex",
      trick_type: "complex_converse_trap",
      explanation: `Invalid: the converse does not follow; not all Y need be X.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `If it is not ${n.x.singular}, then it is not ${n.y.singular}.`,
      is_correct: false,
      logic_group: "complex",
      trick_type: "complex_inverse_trap",
      explanation: `Invalid: the inverse does not follow; something that is not X could still be Y.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: `It cannot be ${n.x.article} without being ${n.y.article}.`,
      is_correct: true,
      logic_group: "complex",
      trick_type: "complex_restate",
      explanation: `Valid: this is a restatement of the conditional.`,
    },
    {
      stimulus_text: stimulus,
      conclusion_text: buildCategoricalAllSentence(n.x, n.y).replace(/\.$/, ""),
      is_correct: true,
      logic_group: "complex",
      trick_type: "complex_universal",
      explanation: `Valid: the conditional implies that every X is a Y.`,
    },
  ];
  return { stimulus, questions };
}

const BLUEPRINTS: ((
  blockId: string,
  n: NounSet
) => { stimulus: string; questions: Omit<SyllogismQuestion, "id" | "macro_block_id">[] })[] = [
  buildCategoricalChain,
  buildRelativeOverlap,
  buildMajorityIntersect,
  buildComplexLink,
];

// ─────────────────────────────────────────────────────────────────────────────
// Public batch API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a batch of independent micro-drill questions (one conclusion per stimulus).
 * Each question has its own macro_block_id. Use for seeding variety in micro mode.
 */
export function generateMicroBatch(count: number): SyllogismQuestion[] {
  const out: SyllogismQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const blueprint = pick(BLUEPRINTS);
    const n = pickNounSet();
    const { questions } = blueprint(randomId(), n);
    const q = pick(questions);
    const blockId = randomId();
    out.push({
      id: randomId(),
      macro_block_id: blockId,
      stimulus_text: q.stimulus_text,
      conclusion_text: q.conclusion_text,
      is_correct: q.is_correct,
      logic_group: q.logic_group,
      trick_type: q.trick_type,
      explanation: q.explanation,
    });
  }
  return out;
}

/**
 * Generates blocks of five questions sharing the same stimulus_text and macro_block_id.
 * Each block uses a four-noun chain: sentence 1 A–B (categorical), sentence 2 B–C (relative),
 * sentence 3 C–D (majority). Five conclusions test valid A–B, valid B–C, false A–C overlap,
 * valid C–D, and an invalid global reverse trap. Returns a flat array.
 */
export function generateMacroBatch(blockCount: number): SyllogismQuestion[] {
  const out: SyllogismQuestion[] = [];
  for (let b = 0; b < blockCount; b++) {
    const blockId = randomId();
    const questions = buildMacroChainBlock(blockId);
    questions.forEach((q) => {
      out.push({
        id: randomId(),
        macro_block_id: blockId,
        stimulus_text: q.stimulus_text,
        conclusion_text: q.conclusion_text,
        is_correct: q.is_correct,
        logic_group: q.logic_group,
        trick_type: q.trick_type,
        explanation: q.explanation,
      });
    });
  }
  return out;
}
