/**
 * Seed public.sjt_questions from supabase/seed/sjt_questions.json.
 * Run: npm run seed:sjt
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHUNK_SIZE = 25;

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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const jsonPath = join(__dirname, "../supabase/seed/sjt_questions.json");
  const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as SeedRow[];

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Upserting ${rows.length} SJT questions…`);
  for (const chunk of chunkArray(rows, CHUNK_SIZE)) {
    const { error } = await supabase.from("sjt_questions").upsert(chunk, {
      onConflict: "id",
    });
    if (error) {
      console.error("Upsert failed:", error.message);
      process.exit(1);
    }
  }
  console.log("Done.");
}

main();
