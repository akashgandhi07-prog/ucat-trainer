/**
 * Independent recomputation check for the exam-grade DM trainer additions.
 *
 * The structural validator (verify:dm-trainers) checks shape only. This script is a
 * SECOND source of truth: for each new question it pins the correct option letter and,
 * where the answer is a bare number, the independently-computed numeric value. If the
 * data file's correctAnswer or the number carried by the correct option disagrees, this
 * fails. Conceptual ("must be true" / "not possible") items are checked by letter only.
 */
import type { DmTrainerOptionId, DmTrainerQuestion } from "../src/types/dmTrainers";
import { VENN_LOGIC_QUESTIONS } from "../src/data/dmTrainers/vennLogicQuestions";
import { DATA_LOGIC_QUESTIONS } from "../src/data/dmTrainers/dataLogicQuestions";

type Expectation = { letter: DmTrainerOptionId; value?: number };

const EXPECTED: Record<string, Expectation> = {
  // ── Venn Logic ────────────────────────────────────────────────────────────
  "venn-exactly-two-pairwise-002": { letter: "A", value: 16 },
  "venn-total-mentions-005": { letter: "C", value: 39 },
  "venn-unknown-overlap-003": { letter: "A" },
  "venn-minimum-overlap-002": { letter: "B", value: 11 },
  "venn-maximum-overlap-001": { letter: "B", value: 26 },
  "venn-exactly-one-atleastone-001": { letter: "B", value: 23 },
  "venn-negative-wording-004": { letter: "B", value: 38 },
  "venn-three-set-instruments-001": { letter: "C", value: 24 },
  "venn-inclusion-exclusion-001": { letter: "C", value: 55 },
  "venn-only-one-from-three-001": { letter: "C", value: 11 },
  "venn-impossible-overlap-002": { letter: "D" },
  "venn-total-mentions-magazines-001": { letter: "B", value: 63 },
  "venn-complement-universal-001": { letter: "A" },
  "venn-neither-from-union-002": { letter: "B", value: 28 },
  "venn-exactly-two-mentions-002": { letter: "B", value: 11 },

  // ── Data Logic ────────────────────────────────────────────────────────────
  "data-missing-percentage-005": { letter: "C", value: 25 },
  "data-denominator-004": { letter: "C", value: 60 },
  "data-at-least-one-004": { letter: "B", value: 0.488 },
  "data-expected-cost-003": { letter: "C" },
  "data-percentage-change-002": { letter: "C", value: 25 },
  "data-successive-percentage-001": { letter: "A", value: 198 },
  "data-reverse-percentage-002": { letter: "B", value: 90 },
  "data-rate-comparison-002": { letter: "B" },
  "data-average-total-002": { letter: "C", value: 36 },
  "data-ratio-002": { letter: "C", value: 60000 },
  "data-missing-probability-002": { letter: "C", value: 0.4 },
  "data-conditional-prob-001": { letter: "C" },
  "data-expected-value-003": { letter: "B", value: 9 },
  "data-percentage-of-percentage-001": { letter: "B", value: 15 },
  "data-weighted-total-001": { letter: "B", value: 56 },
};

const ALL: DmTrainerQuestion[] = [...VENN_LOGIC_QUESTIONS, ...DATA_LOGIC_QUESTIONS];
const byId = new Map(ALL.map((q) => [q.id, q]));

function firstNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const errors: string[] = [];

for (const [id, exp] of Object.entries(EXPECTED)) {
  const q = byId.get(id);
  if (!q) {
    errors.push(`${id}: question not found in data files`);
    continue;
  }
  if (q.correctAnswer !== exp.letter) {
    errors.push(`${id}: correctAnswer is ${q.correctAnswer}, expected ${exp.letter}`);
  }
  const texts = q.options.map((o) => o.text.trim());
  if (new Set(texts).size !== texts.length) {
    errors.push(`${id}: option texts are not all distinct`);
  }
  if (exp.value !== undefined) {
    const opt = q.options.find((o) => o.id === exp.letter);
    const got = opt ? firstNumber(opt.text) : null;
    if (got !== exp.value) {
      errors.push(
        `${id}: correct option ${exp.letter} carries ${got ?? "no number"}, expected ${exp.value}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("DM additions recomputation check FAILED:\n");
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(`Recomputation check passed for ${Object.keys(EXPECTED).length} DM additions.`);
