/**
 * Export seed questions from src/data/dmTrainers to supabase/seed/dm_trainer_questions.json
 * Run: npx tsx scripts/exportDmTrainerQuestionsJson.ts
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VENN_LOGIC_QUESTIONS } from "../src/data/dmTrainers/vennLogicQuestions";
import { DATA_LOGIC_QUESTIONS } from "../src/data/dmTrainers/dataLogicQuestions";
import { ARGUMENT_JUDGE_QUESTIONS } from "../src/data/dmTrainers/argumentJudgeQuestions";
import type { DmTrainerQuestion } from "../src/types/dmTrainers";

const __dirname = dirname(fileURLToPath(import.meta.url));

type SeedRow = {
  id: string;
  trainer_type: string;
  difficulty: string;
  sort_order: number;
  stem: string;
  question: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  skill_tag: string;
  common_trap: string;
  optional_working_steps: string[] | null;
  review: unknown;
  is_active: boolean;
};

function toRow(q: DmTrainerQuestion, sortOrder: number): SeedRow {
  return {
    id: q.id,
    trainer_type: q.trainerType,
    difficulty: q.difficulty,
    sort_order: sortOrder,
    stem: q.stem,
    question: q.question,
    options: q.options,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    skill_tag: q.skillTag,
    common_trap: q.commonTrap,
    optional_working_steps: q.optionalWorkingSteps ?? null,
    review: q.review,
    is_active: true,
  };
}

function main() {
  const rows: SeedRow[] = [
    ...VENN_LOGIC_QUESTIONS.map((q, i) => toRow(q, i)),
    ...DATA_LOGIC_QUESTIONS.map((q, i) => toRow(q, i)),
    ...ARGUMENT_JUDGE_QUESTIONS.map((q, i) => toRow(q, i)),
  ];

  const outPath = join(__dirname, "../supabase/seed/dm_trainer_questions.json");
  writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Wrote ${rows.length} questions to ${outPath}`);
}

main();
