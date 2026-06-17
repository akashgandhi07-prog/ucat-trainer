/**
 * Fuzzes the procedural conversion generators and independently re-derives every
 * answer from the prompt text, so a formula error in conversionGenerators.ts fails CI
 * rather than shipping a wrong "correct" answer to students.
 */
import { generateConversionDrill } from "../src/data/conversionGenerators";
import { COMMON_TRAP_COPY } from "../src/data/commonTrapCopy";

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
function num(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const SCALE_FACTORS: Record<string, { factor: number; mode: "mul" | "div" }> = {
  "km|metres": { factor: 1000, mode: "mul" },
  "m|centimetres": { factor: 100, mode: "mul" },
  "m|millimetres": { factor: 1000, mode: "mul" },
  "cm|metres": { factor: 100, mode: "div" },
  "mm|centimetres": { factor: 10, mode: "div" },
  "kg|grams": { factor: 1000, mode: "mul" },
  "g|milligrams": { factor: 1000, mode: "mul" },
  "g|kilograms": { factor: 1000, mode: "div" },
  "mg|grams": { factor: 1000, mode: "div" },
  "litres|millilitres": { factor: 1000, mode: "mul" },
  "ml|litres": { factor: 1000, mode: "div" },
};

/** Returns the independently-derived answer, or null if the prompt shape isn't recognised. */
function derive(prompt: string): number | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/^Convert ([\d,.]+) (\w+) to (\w+)\.$/))) {
    const value = num(m[1]);
    const cfg = SCALE_FACTORS[`${m[2]}|${m[3]}`];
    if (cfg) return cfg.mode === "mul" ? r2(value * cfg.factor) : r2(value / cfg.factor);
  }
  if ((m = prompt.match(/^Convert ([\d.]+) hours to minutes\.$/))) return r2(num(m[1]) * 60);
  if ((m = prompt.match(/^Convert ([\d.]+) minutes to seconds\.$/))) return r2(num(m[1]) * 60);
  if ((m = prompt.match(/^Convert (\d+) hours? (\d+) minutes to minutes\.$/))) return num(m[1]) * 60 + num(m[2]);
  if ((m = prompt.match(/^Convert (\d+) minutes to hours\./))) return r2(num(m[1]) / 60);
  if ((m = prompt.match(/travels at (\d+) km\/h for (\d+) minutes/))) return r2((num(m[1]) * num(m[2])) / 60);
  if ((m = prompt.match(/^Convert (\d+) km\/h to metres per second\.$/))) return r2(num(m[1]) / 3.6);
  if ((m = prompt.match(/^Convert (\d+) m\/s to km\/h\.$/))) return r2(num(m[1]) * 3.6);
  if ((m = prompt.match(/covers (\d+) km in (\d+) minutes/))) return r2(num(m[1]) / (num(m[2]) / 60));
  if ((m = prompt.match(/(\d+) g of protein per 100 g.*in ([\d,]+) g/))) return r2((num(m[1]) * num(m[2])) / 100);
  if ((m = prompt.match(/(\d+) litres of fuel per 100 km.*over ([\d,]+) km/))) return r2((num(m[1]) * num(m[2])) / 100);
  if ((m = prompt.match(/(\d+) kcal per 100 ml.*in ([\d,]+) ml/))) return r2((num(m[1]) * num(m[2])) / 100);
  if ((m = prompt.match(/dose is (\d+) mg per kg.*for a (\d+) kg/))) return r2(num(m[1]) * num(m[2]));
  if ((m = prompt.match(/^([\d.]+) litres of juice costs £([\d.]+)\./))) return r2(num(m[2]) / num(m[1]));
  if ((m = prompt.match(/^Convert ([\d,]+) pence to pounds\.$/))) return r2(num(m[1]) / 100);
  if ((m = prompt.match(/^Convert £([\d,.]+) to pence\.$/))) return r2(num(m[1]) * 100);
  if ((m = prompt.match(/^£1 = €([\d.]+)\. Convert €([\d,.]+) to pounds\.$/))) return r2(num(m[2]) / num(m[1]));
  if ((m = prompt.match(/^£1 = €([\d.]+)\. Convert £([\d,.]+) to euros\.$/))) return r2(num(m[2]) * num(m[1]));
  if ((m = prompt.match(/^Convert ([\d,]+) cm² to m²\.$/))) return r2(num(m[1]) / 10000);
  if ((m = prompt.match(/^Convert ([\d,.]+) m² to cm²\.$/))) return r2(num(m[1]) * 10000);
  if ((m = prompt.match(/^Convert ([\d,.]+) litres to cm³\.$/))) return r2(num(m[1]) * 1000);
  if ((m = prompt.match(/^Convert ([\d,]+) ml to cm³\.$/))) return num(m[1]);
  if ((m = prompt.match(/uses (\d+) g of \w+.*from ([\d,.]+) kg/))) return Math.floor((num(m[2]) * 1000) / num(m[1]));

  return null;
}

const ROUNDS = 400;
let checked = 0;
const seenCategories = new Set<string>();

for (let i = 0; i < ROUNDS; i += 1) {
  const drill = generateConversionDrill();
  const ids = new Set<string>();
  for (const q of drill) {
    assert(!ids.has(q.id), `Duplicate id within a drill: ${q.id}`);
    ids.add(q.id);
    seenCategories.add(q.category);

    assert(Number.isFinite(q.answer), `Non-finite answer: ${q.prompt}`);
    assert(Math.abs(r2(q.answer) - q.answer) < 1e-9, `Answer not ≤2dp: ${q.prompt} → ${q.answer}`);
    assert(q.prompt.trim().length > 0, "Empty prompt");
    assert(q.answerLabel.trim().length > 0, `Empty answer label: ${q.prompt}`);
    assert(COMMON_TRAP_COPY[q.explanation.commonTrap], `Unknown trap slug "${q.explanation.commonTrap}" in: ${q.prompt}`);
    assert(q.explanation.method.calculate.trim().length > 0, `Missing calculation: ${q.prompt}`);

    const derived = derive(q.prompt);
    assert(derived !== null, `Prompt shape not recognised by verifier: ${q.prompt}`);
    assert(
      Math.abs(derived - q.answer) < 0.001,
      `Answer mismatch: "${q.prompt}" stored ${q.answer}, re-derived ${derived}`,
    );
    checked += 1;
  }
}

const REQUIRED = [
  "Metric length", "Metric mass", "Metric volume", "Time", "Speed and time",
  "Per-100 rates", "Dose and rates", "Money", "Area and volume", "Full portions",
];
for (const c of REQUIRED) assert(seenCategories.has(c), `Generator never produced category: ${c}`);

console.log(`verify-conversion-generator: ${checked} generated questions verified across ${ROUNDS} drills. All categories present.`);
