/**
 * Seed script for syllogism_questions. Run from project root with:
 *   npx tsx scripts/seedSyllogisms.ts
 * Requires .env with SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * UK English in comments and messages.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateMicroBatch, generateMacroBatch } from "../src/utils/SyllogismGenerator.ts";

const CHUNK_SIZE = 50;
const MICRO_COUNT = 500;
const MACRO_BLOCK_COUNT = 100;

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
      "Missing environment variables. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log("Generating 500 micro questions…");
  const microQuestions = generateMicroBatch(MICRO_COUNT);
  console.log("Generating 100 macro blocks (500 questions)…");
  const macroQuestions = generateMacroBatch(MACRO_BLOCK_COUNT);
  const all = [...microQuestions, ...macroQuestions];
  console.log(`Total questions to insert: ${all.length}`);

  const payloads = all.map((q) => ({
    macro_block_id: q.macro_block_id,
    stimulus_text: q.stimulus_text,
    conclusion_text: q.conclusion_text,
    is_correct: q.is_correct,
    logic_group: q.logic_group,
    trick_type: q.trick_type,
    explanation: q.explanation,
  }));

  const chunks = chunkArray(payloads, CHUNK_SIZE);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { error } = await supabase.from("syllogism_questions").insert(chunk);
    if (error) {
      console.error(`Chunk ${i + 1}/${chunks.length} failed:`, error.message);
      process.exit(1);
    }
    console.log(`Inserted chunk ${i + 1}/${chunks.length} (${chunk.length} rows).`);
  }

  console.log("Seeding complete.");
}

main();
