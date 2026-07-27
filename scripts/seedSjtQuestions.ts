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

  // The trainer serves SJT from trainer_questions (see migration
  // 20260520130000_sjt_rpc_question_lab.sql); sjt_questions is kept for rollback.
  // Sync content into the live table too, matched on legacy_id, so seed edits
  // actually reach users. Update-only: the question lab owns inserts there.
  console.log("Syncing content into trainer_questions…");
  let synced = 0;
  const missing: string[] = [];
  const drifted: string[] = [];
  for (const row of rows) {
    // Merge into the existing content JSON rather than replacing it, so keys the
    // question lab owns (e.g. sourceDifficulty) survive the sync. Content is the
    // only field the prevent_active_question_edit trigger allows on active rows;
    // stem and difficulty changes must go through the question lab draft flow, so
    // those are compared and reported as drift rather than written.
    const { data: existing, error: readErr } = await supabase
      .from("trainer_questions")
      .select("id, content, stem, difficulty")
      .eq("legacy_id", row.id)
      .eq("trainer_type", `sjt-${row.type}`);
    if (readErr) {
      console.error(`trainer_questions read failed for ${row.id}:`, readErr.message);
      process.exit(1);
    }
    if (!existing || existing.length === 0) {
      missing.push(row.id);
      continue;
    }
    // Seed difficulty vocabulary maps onto the question-lab scale.
    const difficultyMap: Record<string, string> = {
      foundation: "easy",
      standard: "medium",
      challenging: "hard",
    };
    const mappedDifficulty = difficultyMap[row.difficulty] ?? row.difficulty;
    if (existing[0].stem !== row.stem || existing[0].difficulty !== mappedDifficulty) {
      drifted.push(row.id);
    }
    const content = {
      ...(existing[0].content as Record<string, unknown>),
      domain: row.domain,
      pivotInsight: row.pivot_insight,
      gmpRef: row.gmp_ref,
      items: row.items as unknown,
    };
    const { error } = await supabase
      .from("trainer_questions")
      .update({ content })
      .eq("id", existing[0].id);
    if (error) {
      console.error(`trainer_questions sync failed for ${row.id}:`, error.message);
      process.exit(1);
    }
    synced += 1;
  }
  console.log(`Synced ${synced} trainer_questions rows.`);
  if (missing.length > 0) {
    console.warn(
      `No trainer_questions row for: ${missing.join(", ")} (add via question lab if these are new scenarios).`,
    );
  }
  if (drifted.length > 0) {
    console.warn(
      `Stem or difficulty differs from the live table for: ${drifted.join(", ")}. ` +
        "The live values were kept; structural edits go through the question lab draft flow.",
    );
  }
  console.log("Done.");
}

main();
