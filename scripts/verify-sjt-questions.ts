import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SJT_QUESTIONS } from "./sjtQuestions.source";
import { SJT_EXPANSION } from "./sjtQuestions.september2026";
import { validateSjtQuestions } from "./lib/validateSjtQuestions";
import { mapRawQuestionForImport } from "../src/lib/questionLabMapImport";

const errors = [
  ...validateSjtQuestions([...SJT_QUESTIONS, ...SJT_EXPANSION]),
  ...validateSjtQuestions(SJT_EXPANSION, true),
];
// Ensure the import used by administrators preserves the actual keys and citations.
for (const type of ["appropriateness", "importance", "ranking"] as const) {
  const batch = SJT_EXPANSION.filter(q => q.type === type);
  batch.forEach((question, i) => {
    const row = mapRawQuestionForImport(JSON.parse(JSON.stringify(question)), `sjt-${type}`);
    assert(typeof row !== "string", `Import failed for ${type}`);
    assert.equal(row.legacy_id, batch[i].id);
    assert.deepEqual(row.content.items, batch[i].items);
    assert.deepEqual(row.content.gmpRef, batch[i].gmpRef, "Scenario reference must survive import");
  });
  const exported = JSON.parse(readFileSync(new URL(`../question-lab/batches/sjt-2026-09-22/${type}.json`, import.meta.url), "utf8"));
  assert.deepEqual(exported, batch, `Stale ${type} export: run npm run export:sjt-expansion`);
}
// Mutation checks prove the gate rejects common bank-corruption mistakes.
const duplicate = structuredClone(SJT_EXPANSION);
duplicate[1].id = duplicate[0].id;
assert(validateSjtQuestions(duplicate).some(e => e.includes("duplicate ID")));
const wrongScale = structuredClone(SJT_EXPANSION);
if (wrongScale[0].type !== "ranking") wrongScale[0].items[0].correctRating = "very_important";
assert(validateSjtQuestions(wrongScale).some(e => e.includes("rating is invalid")));
const duplicateRank = structuredClone(SJT_EXPANSION.filter(q => q.type === "ranking"));
if (duplicateRank[0].type === "ranking") duplicateRank[0].items[1].rank = duplicateRank[0].items[0].rank;
assert(validateSjtQuestions(duplicateRank).some(e => e.includes("unique 1, 2, 3")));
assert(validateSjtQuestions([{ ...SJT_EXPANSION[0], items: [null] }]).length > 0);
// Repeated ratings are legitimate. Never force one answer into each category.
const sameRatings = structuredClone(SJT_EXPANSION.slice(0, 1));
if (sameRatings[0].type !== "ranking") for (const item of sameRatings[0].items) item.correctRating = "very_appropriate";
assert.deepEqual(validateSjtQuestions(sameRatings), []);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`SJT integrity checks passed: ${SJT_QUESTIONS.length} existing scenarios and ${SJT_EXPANSION.length} drafts (${SJT_EXPANSION.reduce((n, q) => n + q.items.length, 0)} new response items).`);
console.log("Import round-trip, export freshness and mutation checks passed. Professional judgement is not certified by these checks.");
