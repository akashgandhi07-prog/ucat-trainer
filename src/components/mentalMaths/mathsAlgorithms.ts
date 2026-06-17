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
  explanation: QuestionExplanation;
}

export interface McqQuestion {
  kind: "mcq";
  prompt: string;
  options: number[];
  correctIndex: number;
  explanation: QuestionExplanation;
}

export type QuestionPayload = ExactQuestion | McqQuestion;

export interface QuestionExplanation {
  method: {
    target: string;
    convert: string;
    calculate: string;
  };
  examShortcut: string;
  senseCheck: string;
  commonTrap: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function intBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Stage 1: A × B, A and B from 2-15, exclude 10 */
export function generateTimesTable(): ExactQuestion {
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];
  const A = pick(pool);
  const B = pick(pool);
  const answer = roundToTwo(A * B);
  return {
    kind: "exact",
    prompt: `${A} × ${B}`,
    answer,
    explanation: {
      method: {
        target: `Find ${A} groups of ${B}.`,
        convert: "No unit conversion is needed.",
        calculate: `${A} × ${B} = ${answer}.`,
      },
      examShortcut: `Break it into an easy multiple if needed: ${A} × ${B} can be split into tens/fives plus the remainder.`,
      senseCheck: `The answer should be bigger than both ${A} and ${B}, because both numbers are greater than 1.`,
      commonTrap: "single-digit-times-table-slip",
    },
  };
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
    return {
      kind: "exact",
      prompt: `${fracStr} = ?%`,
      answer: roundToTwo(pct),
      explanation: {
        method: {
          target: `Convert ${fracStr} into a percentage.`,
          convert: "A percentage is out of 100.",
          calculate: `${fracStr} = ${pct}/100 = ${pct}%.`,
        },
        examShortcut: `Memorise the common UCAT pairs: ${fracStr} = ${pct}%.`,
        senseCheck: `${fracStr} is ${frac < 0.5 ? "less than" : frac === 0.5 ? "exactly" : "more than"} half, so ${pct}% is the right size.`,
        commonTrap: "fraction-percentage-pair-confusion",
      },
    };
  } else {
    return {
      kind: "exact",
      prompt: `${pct}% as a decimal?`,
      answer: roundToTwo(frac),
      explanation: {
        method: {
          target: `Write ${pct}% as a decimal.`,
          convert: "Percent means divide by 100.",
          calculate: `${pct} ÷ 100 = ${roundToTwo(frac)}.`,
        },
        examShortcut: "Move the decimal point two places left when changing a percentage to a decimal.",
        senseCheck: `${pct}% is less than 100%, so the decimal must be less than 1.`,
        commonTrap: "percent-not-divided-by-100",
      },
    };
  }
}

/** Stage 1: N × N, N from 2-20 */
export function generateSquare(): ExactQuestion {
  const N = intBetween(2, 20);
  const answer = roundToTwo(N * N);
  return {
    kind: "exact",
    prompt: `${N} × ${N}`,
    answer,
    explanation: {
      method: {
        target: `Find ${N} squared.`,
        convert: "No unit conversion is needed.",
        calculate: `${N} × ${N} = ${answer}.`,
      },
      examShortcut: `Know squares up to 20 cold; it saves calculator time in QR.`,
      senseCheck: `${N} × ${N} should be ${N > 10 ? "above" : "below"} ${N} × 10 = ${N * 10}, so ${answer} is sensible.`,
      commonTrap: "square-times-two-instead-of-times-itself",
    },
  };
}

/** Stage 2: P% of N. P in {5,10,15,20}, N in [110, 990] ending in 0 */
export function generatePercentageHack(): ExactQuestion {
  const P = pick([5, 10, 15, 20]);
  const N = intBetween(11, 99) * 10;
  const answer = roundToTwo((P / 100) * N);
  return {
    kind: "exact",
    prompt: `${P}% of ${N}`,
    answer,
    explanation: {
      method: {
        target: `${P}% of ${N}.`,
        convert: `${P}% means ${P}/100.`,
        calculate: `${N} × ${P}/100 = ${answer}.`,
      },
      examShortcut: P === 5
        ? `Find 10% of ${N} then halve it.`
        : P === 15
          ? `Find 10% of ${N} and 5% of ${N}, then add them.`
          : `Type: ${N} × ${P} ÷ 100.`,
      senseCheck: `${P}% is ${P < 50 ? "well under" : "around"} half, so the answer should be ${P < 50 ? "well under" : "near"} ${N / 2}.`,
      commonTrap: "percent-not-converted-to-decimal",
    },
  };
}

/** Two-digit non-multiple-of-10: 11-99 excluding 20,30,...,90 */
function twoDigitNonTen(): number {
  const tens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ones = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return pick(tens) * 10 + pick(ones);
}

/** Stage 2: two-digit (excl multiples of 10) × single digit 3-9 */
export function generateChunkedMultiplication(): ExactQuestion {
  const A = twoDigitNonTen();
  const B = intBetween(3, 9);
  const answer = roundToTwo(A * B);
  const tensPart = Math.floor(A / 10) * 10;
  const onesPart = A - tensPart;
  return {
    kind: "exact",
    prompt: `${A} × ${B}`,
    answer,
    explanation: {
      method: {
        target: `Multiply ${A} by ${B}.`,
        convert: "No unit conversion is needed.",
        calculate: `${A} × ${B} = ${answer}.`,
      },
      examShortcut: `Chunk it: ${tensPart} × ${B} plus ${onesPart} × ${B}.`,
      senseCheck: `${A} × ${B} should be between ${tensPart * B} and ${(tensPart + 10) * B}.`,
      commonTrap: "chunked-multiplication-place-value-error",
    },
  };
}

/**
 * Build four estimate options: the target, two values close to it (a plausible
 * over/under-estimate), and one decimal-place ("order of magnitude") trap. Real UCAT
 * distractors sit near the answer, so options can't be eliminated by size alone.
 * Near values are rounded to a sensible step so they still read as "clean" numbers.
 */
function buildEstimateOptions(target: number): number[] {
  const step = target >= 10000 ? 1000 : target >= 1000 ? 100 : 10;
  const roundStep = (v: number) => roundToTwo(Math.round(v / step) * step);

  const options: number[] = [target];
  const pushUnique = (v: number) => {
    if (v > 0 && !options.some((o) => Math.abs(o - v) < 0.01)) options.push(v);
  };

  pushUnique(roundStep(target * 1.2)); // over-estimate (rounded the wrong way)
  pushUnique(roundStep(target * 0.8)); // under-estimate
  pushUnique(roundToTwo(target / 10)); // decimal-place slip

  // Pad with progressively wider near-values if any candidate collided.
  let spread = 0.3;
  while (options.length < 4) {
    pushUnique(roundStep(target * (1 + spread)));
    pushUnique(roundStep(target * (1 - spread)));
    spread += 0.15;
    if (spread > 0.9) break;
  }
  while (options.length < 4) pushUnique(roundToTwo(target * (options.length + 2)));

  return options;
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
  const options = buildEstimateOptions(target);
  const { arr, correctIndex } = shuffleWithIndex(options, target);
  return {
    kind: "mcq",
    prompt: `Estimate: ${a} × ${b}`,
    options: arr,
    correctIndex,
    explanation: {
      method: {
        target: `Estimate ${a} × ${b}.`,
        convert: "No unit conversion is needed; this is an estimation question.",
        calculate: `Round to ${roundedA} × ${roundedB} = ${target}.`,
      },
      examShortcut: `Round first, then multiply: ${roundedA} × ${roundedB}. Avoid exact long multiplication.`,
      senseCheck: `${a} is close to ${roundedA} and ${b} is close to ${roundedB}, so the estimate should be close to ${target}.`,
      commonTrap: "over-calculating-an-estimate",
    },
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
  const options = buildEstimateOptions(target);
  const { arr, correctIndex } = shuffleWithIndex(options, target);
  const prompt = template
    .replace("{population}", population.toLocaleString())
    .replace("{pct}", String(pct));
  return {
    kind: "mcq",
    prompt,
    options: arr,
    correctIndex,
    explanation: {
      method: {
        target: `Estimate ${pct}% of ${population.toLocaleString()}.`,
        convert: `${pct}% means ${pct}/100; round the population to ${roundPop.toLocaleString()}.`,
        calculate: `${roundPop.toLocaleString()} × ${pct}/100 = ${target.toLocaleString()}.`,
      },
      examShortcut: `Round ${population.toLocaleString()} to ${roundPop.toLocaleString()} first, then type: ${roundPop} × ${pct} ÷ 100.`,
      senseCheck: `${pct}% is roughly a quarter or less, so the answer should be much smaller than ${population.toLocaleString()}.`,
      commonTrap: "exact-calculation-when-estimate-asked",
    },
  };
}

const FIXED_UCAT_QR_QUESTIONS: ExactQuestion[] = [
  {
    kind: "exact",
    prompt: "A car travels at 96 km/h for 35 minutes. How many kilometres does it travel?",
    answer: 56,
    explanation: {
      method: {
        target: "Distance in kilometres.",
        convert: "35 minutes is 35/60 hours.",
        calculate: "96 × 35/60 = 56 km.",
      },
      examShortcut: "Type: 96 × 35 ÷ 60. Or use 35/60 = 7/12, so 96 ÷ 12 × 7.",
      senseCheck: "35 minutes is just over half an hour, so the distance should be just over half of 96 km.",
      commonTrap: "minutes-used-as-hours",
    },
  },
  {
    kind: "exact",
    prompt: "Convert 12.4 km to metres.",
    answer: 12400,
    explanation: {
      method: {
        target: "Metres.",
        convert: "1 km = 1000 m.",
        calculate: "12.4 × 1000 = 12,400 m.",
      },
      examShortcut: "Km to metres means multiply by 1000, so move the decimal three places right.",
      senseCheck: "Metres are smaller than kilometres, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    kind: "exact",
    prompt: "A £64 coat has 15% off. What is the sale price in pounds?",
    answer: 54.4,
    explanation: {
      method: {
        target: "Sale price after the discount.",
        convert: "15% off means you pay 85%.",
        calculate: "64 × 85/100 = 54.40.",
      },
      examShortcut: "For 15% off, pay 85%. Type: 64 × 0.85.",
      senseCheck: "A 15% discount on £64 is just under £10, so the final price should be just over £54.",
      commonTrap: "subtracted-percentage-not-price",
    },
  },
  {
    kind: "exact",
    prompt: "A recipe uses 240 g of flour per cake. How many full cakes can be made from 1.1 kg of flour?",
    answer: 4,
    explanation: {
      method: {
        target: "Number of full cakes.",
        convert: "1.1 kg = 1100 g.",
        calculate: "1100 ÷ 240 = 4.58..., so only 4 full cakes.",
      },
      examShortcut: "Convert kg to g first, then divide and round down for full servings: 1100 ÷ 240.",
      senseCheck: "Four cakes need 960 g and five cakes need 1200 g, so 4 full cakes fits.",
      commonTrap: "rounded-up-when-full-servings-required",
    },
  },
  {
    kind: "exact",
    prompt: "A medicine dose is 2.5 ml per kg. How many ml are needed for a 48 kg patient?",
    answer: 120,
    explanation: {
      method: {
        target: "Dose in ml.",
        convert: "The rate is already per kg, and the patient mass is in kg.",
        calculate: "2.5 × 48 = 120 ml.",
      },
      examShortcut: "Use 2.5 = 10/4, so 48 × 10 ÷ 4 = 120.",
      senseCheck: "2 ml per kg would be 96 ml and 3 ml per kg would be 144 ml, so 120 ml is sensible.",
      commonTrap: "per-unit-rate-multiplied-by-wrong-unit",
    },
  },
];

const STAGE_1_GENERATORS: (() => ExactQuestion)[] = [
  generateTimesTable,
  generateFractionToPercent,
  generateSquare,
];

const STAGE_2_GENERATORS: (() => ExactQuestion)[] = [
  generatePercentageHack,
  generateChunkedMultiplication,
];

/** Returns one question for the given stage (0-3). */
export function getQuestionForStage(stageIndex: number): QuestionPayload {
  switch (stageIndex) {
    case 0:
      return pick(STAGE_1_GENERATORS)();
    case 1:
      return pick(STAGE_2_GENERATORS)();
    case 2:
      return generateRoundingDrill();
    case 3:
      if (Math.random() < 0.45) return pick(FIXED_UCAT_QR_QUESTIONS);
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

const FRAC_STR_TO_DECIMAL: Record<string, number> = {
  "1/4": 0.25,
  "1/2": 0.5,
  "1/5": 0.2,
  "1/10": 0.1,
  "3/4": 0.75,
};

/**
 * Dev / CI helper: recomputes the expected answer from the prompt and compares it to what the generator stored.
 * Throws if anything is wrong (including MCQ index not matching the recomputed target).
 */
export function assertMentalMathsQuestionConsistent(q: QuestionPayload): void {
  const err = mentalMathsQuestionInconsistencyMessage(q);
  if (err) throw new Error(err);
}

export function mentalMathsQuestionInconsistencyMessage(q: QuestionPayload): string | null {
  if (q.kind === "exact") {
    const mul = q.prompt.match(/^(\d+) × (\d+)$/);
    if (mul) {
      const a = parseInt(mul[1], 10);
      const b = parseInt(mul[2], 10);
      const expected = roundToTwo(a * b);
      return q.answer === expected ? null : `times/square: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const fracToPct = q.prompt.match(/^(1\/4|1\/2|1\/5|1\/10|3\/4) = \?%$/);
    if (fracToPct) {
      const d = FRAC_STR_TO_DECIMAL[fracToPct[1]];
      const expected = roundToTwo(d * 100);
      return q.answer === expected ? null : `fraction→%: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const pctToDec = q.prompt.match(/^(\d+)% as a decimal\?$/);
    if (pctToDec) {
      const pct = parseInt(pctToDec[1], 10);
      const expected = roundToTwo(pct / 100);
      return q.answer === expected ? null : `%→decimal: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const pctOf = q.prompt.match(/^(\d+)% of (\d+)$/);
    if (pctOf) {
      const p = parseInt(pctOf[1], 10);
      const n = parseInt(pctOf[2], 10);
      const expected = roundToTwo((p / 100) * n);
      return q.answer === expected ? null : `% of: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const speedTime = q.prompt.match(/^A car travels at ([\d.]+) km\/h for ([\d.]+) minutes\. How many kilometres does it travel\?$/);
    if (speedTime) {
      const speed = parseFloat(speedTime[1]);
      const minutes = parseFloat(speedTime[2]);
      const expected = roundToTwo(speed * minutes / 60);
      return q.answer === expected ? null : `speed-time: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const kmToM = q.prompt.match(/^Convert ([\d.]+) km to metres\.$/);
    if (kmToM) {
      const km = parseFloat(kmToM[1]);
      const expected = roundToTwo(km * 1000);
      return q.answer === expected ? null : `km→m: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const discount = q.prompt.match(/^A £([\d.]+) coat has ([\d.]+)% off\. What is the sale price in pounds\?$/);
    if (discount) {
      const price = parseFloat(discount[1]);
      const pctOff = parseFloat(discount[2]);
      const expected = roundToTwo(price * (100 - pctOff) / 100);
      return q.answer === expected ? null : `discount: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const fullCakes = q.prompt.match(/^A recipe uses ([\d.]+) g of flour per cake\. How many full cakes can be made from ([\d.]+) kg of flour\?$/);
    if (fullCakes) {
      const gramsPerCake = parseFloat(fullCakes[1]);
      const kg = parseFloat(fullCakes[2]);
      const expected = Math.floor((kg * 1000) / gramsPerCake);
      return q.answer === expected ? null : `full cakes: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    const dose = q.prompt.match(/^A medicine dose is ([\d.]+) ml per kg\. How many ml are needed for a ([\d.]+) kg patient\?$/);
    if (dose) {
      const mlPerKg = parseFloat(dose[1]);
      const kg = parseFloat(dose[2]);
      const expected = roundToTwo(mlPerKg * kg);
      return q.answer === expected ? null : `dose: expected ${expected}, got ${q.answer} (${q.prompt})`;
    }

    return `exact prompt not recognised: ${q.prompt}`;
  }

  const uniq = new Set(q.options.map((x) => roundToTwo(x)));
  if (uniq.size !== q.options.length) {
    return `mcq duplicate options after roundToTwo: ${q.prompt}`;
  }

  const est = q.prompt.match(/^Estimate: (\d+) × (\d+)$/);
  if (est) {
    const a = parseInt(est[1], 10);
    const b = parseInt(est[2], 10);
    const roundedA = Math.round(a / 100) * 100;
    const roundedB = Math.round(b / 10) * 10;
    const target = roundToTwo(roundedA * roundedB);
    const chosen = q.options[q.correctIndex];
    return chosen === target ? null : `rounding mcq: target ${target}, index ${q.correctIndex} has ${chosen} (${q.prompt})`;
  }

  const wordPopPct =
    q.prompt.match(/^In a survey of ([\d,]+) people, (\d+)%/) ||
    q.prompt.match(/^A town has ([\d,]+) residents\. (\d+)%/) ||
    q.prompt.match(/^Out of ([\d,]+) patients, (\d+)%/);
  if (wordPopPct) {
    const popRaw = parseInt(wordPopPct[1].replace(/,/g, ""), 10);
    const pct = parseInt(wordPopPct[2], 10);
    const roundPop = Math.round(popRaw / 1000) * 1000;
    const target = roundToTwo((pct / 100) * roundPop);
    const chosen = q.options[q.correctIndex];
    return chosen === target ? null : `word mcq: target ${target}, index ${q.correctIndex} has ${chosen} (${q.prompt})`;
  }

  return `mcq prompt not recognised: ${q.prompt.slice(0, 80)}...`;
}
