/** Export editorial drafts through the same mapping used by Question Lab. No DB writes. */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SJT_EXPANSION } from "./sjtQuestions.september2026";
import { assertValidSjtQuestions } from "./lib/validateSjtQuestions";
import { mapRawQuestionForImport } from "../src/lib/questionLabMapImport";

assertValidSjtQuestions(SJT_EXPANSION, true);
const dir = fileURLToPath(new URL("../question-lab/batches/sjt-2026-09-22/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const type of ["appropriateness", "importance", "ranking"] as const) {
  const questions = SJT_EXPANSION.filter(q => q.type === type);
  for (const question of questions) {
    const mapped = mapRawQuestionForImport(JSON.parse(JSON.stringify(question)), `sjt-${type}`);
    if (typeof mapped === "string") throw new Error(mapped);
  }
  // Raw questions are for the UI import box. They are never published here.
  writeFileSync(`${dir}${type}.json`, JSON.stringify(questions, null, 2) + "\n");
}
const review = [
  "# SJT expansion: editorial review copy",
  "",
  "12 original draft scenarios, 44 response items. Prepared 22 September 2026.",
  "",
  "These are proposed educational keys, not official UCAT questions or GMC-endorsed ratings. See REVIEW.md for sources, checks and remaining editorial review. Not published or included in seed:sjt.",
];
for (const q of SJT_EXPANSION) {
  review.push("", `## ${q.id}: ${q.type}`, "", `${q.domain} · ${q.difficulty}`, "", q.stem, "", `Teaching point: ${q.pivotInsight}`, "", `[${q.gmpRef!.label}](${q.gmpRef!.url})`);
  for (const item of q.items) {
    review.push("", `### ${item.id}`, "", item.text, "", `**Proposed key: ${"rank" in item ? `rank ${item.rank}` : item.correctRating}**`, "", item.rationale);
    if ("whyNotAdjacent" in item) review.push("", `Rating boundary: ${item.whyNotAdjacent}`);
  }
}
writeFileSync(`${dir}QUESTIONS.md`, review.join("\n") + "\n");
console.log(`Exported ${SJT_EXPANSION.length} drafts to ${dir}. No database changes.`);
