/**
 * Migrate DM trainer questions from supabase/seed/dm_trainer_questions.json
 * into the new public.trainer_questions table.
 *
 * Run: npx tsx scripts/seedDmToQuestionLab.ts
 *
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 * in .env or .env.local.
 *
 * Safe to run multiple times — uses upsert on legacy_id.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shape of the existing seed JSON
type OldRow = {
  id: string;
  trainer_type: "venn-logic" | "data-logic" | "argument-judge";
  difficulty: "easy" | "medium" | "hard";
  sort_order: number;
  stem: string;
  question: string;
  options: Array<{ id: "A" | "B" | "C" | "D"; text: string; label?: string }>;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  skill_tag: string;
  common_trap: string;
  optional_working_steps: string[] | null;
  review: unknown;
  is_active: boolean;
};

function toOptionsRecord(
  options: OldRow["options"]
): Record<"A" | "B" | "C" | "D", string> {
  const record = {} as Record<"A" | "B" | "C" | "D", string>;
  for (const opt of options) {
    record[opt.id] = opt.text;
  }
  return record;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }

  const jsonPath = join(__dirname, "../supabase/seed/dm_trainer_questions.json");
  const oldRows = JSON.parse(readFileSync(jsonPath, "utf8")) as OldRow[];

  console.log(`Mapping ${oldRows.length} DM questions to trainer_questions format…`);

  const newRows = oldRows.map((q) => ({
    legacy_id:      q.id,
    section:        "dm",
    trainer_type:   q.trainer_type,
    question_kind:  "mcq",
    status:         q.is_active ? "active" : "draft",
    difficulty:     q.difficulty,
    skill_tag:      q.skill_tag,
    stem:           q.stem,
    explanation:    q.explanation,
    content: {
      question:      q.question,
      options:       toOptionsRecord(q.options),
      correctAnswer: q.correct_answer,
      commonTrap:    q.common_trap,
      workingSteps:  q.optional_working_steps ?? undefined,
    },
    media:          [],
    quality_status: "pass",
    quality_notes:  "Migrated from local DM trainer bank. Manually reviewed before launch.",
    is_flagged:     false,
    flag_count:     0,
    created_by:     null,
    updated_by:     null,
    replaces_question_id: null,
  }));

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Upsert in batches of 50 to stay within Supabase limits
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("trainer_questions")
      .upsert(batch, { onConflict: "legacy_id" });

    if (error) {
      console.error(`Batch ${i}–${i + batch.length} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ✓ ${inserted} / ${newRows.length}`);
  }

  console.log(`\nDone. ${inserted} DM questions are now in trainer_questions.`);
}

main();
