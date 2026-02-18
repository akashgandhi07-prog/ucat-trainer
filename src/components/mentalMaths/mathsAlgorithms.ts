/**
 * Mental Maths question generation with strict floating-point handling.
 * All numeric answers use roundToTwo to avoid JavaScript precision errors.
 */

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ExactQuestion {
  kind: "exact";
  prompt: string;
  answer: number;
}

export interface McqQuestion {
  kind: "mcq";
  prompt: string;
  options: number[];
  correctIndex: number;
}

export type QuestionPayload = ExactQuestion | McqQuestion;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function intBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Stage 1: A × B, A and B from 2–15, exclude 10 */
export function generateTimesTable(): ExactQuestion {
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];
  const A = pick(pool);
  const B = pick(pool);
  const answer = roundToTwo(A * B);
  return { kind: "exact", prompt: `${A} × ${B}`, answer };
}

// Only fractions with clean percentages (no 33.33, 66.67, 12.5, 37.5, 62.5) to avoid ambiguous rounding.
const FRACTION_PERCENT_CLEAN: [number, number][] = [
  [0.25, 25], [0.5, 50], [0.2, 20], [0.1, 10], [0.75, 75],
];

/** Stage 1: fraction ↔ percentage. Only clean pairs (1/4, 1/2, 1/5, 1/10, 3/4) so no 66.67 or 0.13-style answers. */
export function generateFractionToPercent(): ExactQuestion {
  const [frac, pct] = pick(FRACTION_PERCENT_CLEAN);
  const askForPercent = Math.random() < 0.5;
  if (askForPercent) {
    const fracStr = frac === 0.25 ? "1/4" : frac === 0.5 ? "1/2" : frac === 0.2 ? "1/5" : frac === 0.1 ? "1/10" : "3/4";
    return { kind: "exact", prompt: `${fracStr} = ?%`, answer: roundToTwo(pct) };
  } else {
    return { kind: "exact", prompt: `${pct}% as a decimal?`, answer: roundToTwo(frac) };
  }
}

/** Stage 1: N × N, N from 2–20 */
export function generateSquare(): ExactQuestion {
  const N = intBetween(2, 20);
  const answer = roundToTwo(N * N);
  return { kind: "exact", prompt: `${N} × ${N}`, answer };
}

/** Stage 2: P% of N. P in {5,10,15,20}, N in [110, 990] ending in 0 */
export function generatePercentageHack(): ExactQuestion {
  const P = pick([5, 10, 15, 20]);
  const N = intBetween(11, 99) * 10;
  const answer = roundToTwo((P / 100) * N);
  return { kind: "exact", prompt: `${P}% of ${N}`, answer };
}

/** Two-digit non-multiple-of-10: 11–99 excluding 20,30,...,90 */
function twoDigitNonTen(): number {
  const tens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ones = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return pick(tens) * 10 + pick(ones);
}

/** Stage 2: two-digit (excl multiples of 10) × single digit 3–9 */
export function generateChunkedMultiplication(): ExactQuestion {
  const A = twoDigitNonTen();
  const B = intBetween(3, 9);
  const answer = roundToTwo(A * B);
  return { kind: "exact", prompt: `${A} × ${B}`, answer };
}

/** Shuffle array and return new array plus index of where `value` moved to */
function shuffleWithIndex<T>(arr: T[], correctValue: T): { arr: T[]; correctIndex: number } {
  const withIndices = arr.map((v, i) => ({ v, i }));
  for (let i = withIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [withIndices[i], withIndices[j]] = [withIndices[j], withIndices[i]];
  }
  const out = withIndices.map((x) => x.v);
  const correctIndex = out.indexOf(correctValue);
  return { arr: out, correctIndex };
}

/** Stage 3: rounding drill. e.g. 389 × 51 → round to 400×50, distractors ×10, /10, wrong leading digit */
export function generateRoundingDrill(): McqQuestion {
  const a = intBetween(300, 499);
  const b = intBetween(40, 69);
  const roundedA = Math.round(a / 100) * 100;
  const roundedB = Math.round(b / 10) * 10;
  const target = roundToTwo(roundedA * roundedB);
  const d1 = roundToTwo(target * 10);
  const d2 = roundToTwo(target / 10);
  const wrongLead = target >= 10000 ? roundToTwo(target * 0.5) : roundToTwo(target * 2);
  const options = [target, d1, d2, wrongLead];
  const { arr, correctIndex } = shuffleWithIndex(options, target);
  return {
    kind: "mcq",
    prompt: `Estimate: ${a} × ${b}`,
    options: arr,
    correctIndex,
  };
}

const WORD_TEMPLATES: Array<{
  template: string;
  populationRange: [number, number];
  pctValues: number[];
}> = [
  {
    template: "In a survey of {population} people, {pct}% said they would pay more for eco-friendly products. Approximately how many is that?",
    populationRange: [8000, 45000],
    pctValues: [12, 18, 22, 28],
  },
  {
    template: "A town has {population} residents. {pct}% use public transport at least once a week. Estimate how many that is.",
    populationRange: [12000, 38000],
    pctValues: [12, 18, 22, 28],
  },
  {
    template: "Out of {population} patients, {pct}% reported improvement. About how many patients is that?",
    populationRange: [5000, 25000],
    pctValues: [12, 18, 22, 28],
  },
];

/** Stage 4: word problem with population, awkward %, estimate */
export function generateWordProblem(): McqQuestion {
  const { template, populationRange, pctValues } = pick(WORD_TEMPLATES);
  const population = intBetween(populationRange[0], populationRange[1]);
  const pct = pick(pctValues);
  const roundPop = Math.round(population / 1000) * 1000;
  const roundPct = pct;
  const target = roundToTwo((roundPct / 100) * roundPop);
  const d1 = roundToTwo(target * 10);
  const d2 = roundToTwo(target / 10);
  const wrongLead = target >= 1000 ? roundToTwo(target * 0.5) : roundToTwo(target * 2);
  const options = [target, d1, d2, wrongLead];
  const { arr, correctIndex } = shuffleWithIndex(options, target);
  const prompt = template
    .replace("{population}", population.toLocaleString())
    .replace("{pct}", String(pct));
  return { kind: "mcq", prompt, options: arr, correctIndex };
}

const STAGE_1_GENERATORS: (() => ExactQuestion)[] = [
  generateTimesTable,
  generateFractionToPercent,
  generateSquare,
];

const STAGE_2_GENERATORS: (() => ExactQuestion)[] = [
  generatePercentageHack,
  generateChunkedMultiplication,
];

/** Returns one question for the given stage (0–3). */
export function getQuestionForStage(stageIndex: number): QuestionPayload {
  switch (stageIndex) {
    case 0:
      return pick(STAGE_1_GENERATORS)();
    case 1:
      return pick(STAGE_2_GENERATORS)();
    case 2:
      return generateRoundingDrill();
    case 3:
      return generateWordProblem();
    default:
      return pick(STAGE_1_GENERATORS)();
  }
}

/** Compare user answer to expected for exact questions. Uses 0.01 tolerance; avoids accepting 0.13 for 0.125. */
export function isExactAnswerCorrect(userValue: number, expected: number): boolean {
  const u = roundToTwo(userValue);
  const e = roundToTwo(expected);
  if (Math.abs(u - e) < 0.01) return true;
  // Exact match for values that don't round cleanly to 2 dp (e.g. 0.125 stored as 0.13)
  return Math.abs(userValue - expected) < 0.002;
}
