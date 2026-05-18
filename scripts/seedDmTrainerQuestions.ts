/**
 * Seed public.dm_trainer_questions from supabase/seed/dm_trainer_questions.json.
 * Run: npm run seed:dm-trainers
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const jsonPath = join(__dirname, "../supabase/seed/dm_trainer_questions.json");
  const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as SeedRow[];

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Upserting ${rows.length} DM trainer questions…`);
  const { error } = await supabase.from("dm_trainer_questions").upsert(rows, {
    onConflict: "id",
  });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }
  console.log("Done.");
}

main();
