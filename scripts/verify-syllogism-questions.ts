/**
 * Checks the live syllogism bank for structural defects. Run from project root:
 *   npm run verify:syllogisms
 * Requires .env with SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { validateSyllogismQuestions, type SyllogismRow } from "../src/utils/syllogismValidation";

const PAGE_SIZE = 1000;

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing environment variables. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const rows: SyllogismRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("syllogism_questions")
      .select("id, question_mode, stimulus_text, conclusion_text, is_correct, trick_type")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`Failed to read syllogism_questions: ${error.message}`);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as SyllogismRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`Checked ${rows.length} syllogism questions.`);
  const issues = validateSyllogismQuestions(rows);

  if (issues.length > 0) {
    console.error(`\nSyllogism validation failed with ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      console.error(`  [${issue.questionId}] ${issue.message}`);
    }
    process.exit(1);
  }

  console.log("All syllogism questions passed validation.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
