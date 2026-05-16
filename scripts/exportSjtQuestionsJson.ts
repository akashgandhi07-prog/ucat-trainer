/**
 * Export supabase/seed/sjt_questions.json from scripts/sjtQuestions.source.ts.
 * Run: npm run export:sjt
 * Keep scripts/sjtQuestions.source.ts as the editorial source when adding scenarios.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SJT_QUESTIONS } from "./sjtQuestions.source.ts";
import type { SJTQuestion } from "../src/types/sjt.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../supabase/seed/sjt_questions.json");

type SeedRow = {
  id: string;
  type: string;
  domain: string;
  difficulty: string;
  stem: string;
  pivot_insight: string | null;
  gmp_ref: unknown;
  items: unknown;
};

function toSeedRow(q: SJTQuestion): SeedRow {
  return {
    id: q.id,
    type: q.type,
    domain: q.domain,
    difficulty: q.difficulty,
    stem: q.stem,
    pivot_insight: q.pivotInsight ?? null,
    gmp_ref: q.gmpRef ?? null,
    items: q.items,
  };
}

const rows = SJT_QUESTIONS.map(toSeedRow);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Wrote ${rows.length} SJT scenarios to ${outPath}`);
