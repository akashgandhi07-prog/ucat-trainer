import assert from "node:assert/strict";
import { recommendSJTDrill, type SJTRecommendationRow } from "../src/lib/sjtRecommendation";

const row = (domain: SJTRecommendationRow["domain"], type: SJTRecommendationRow["question_type"], score: number, max_score = 4): SJTRecommendationRow => ({ domain, question_type: type, score, max_score, completed: true });
assert.equal(recommendSJTDrill([]).reason, "starting_point");
assert.equal(recommendSJTDrill([row("trust_professionalism", "appropriateness", 3)]).type, "importance", "Sparse data should fill the least-practised type");
const weakest = recommendSJTDrill([
  row("trust_professionalism", "appropriateness", 2),
  row("trust_professionalism", "ranking", 1),
  row("patients_partnership_communication", "appropriateness", 4),
  row("patients_partnership_communication", "importance", 4),
]);
assert.equal(weakest.reason, "weakest_topic");
assert.equal(weakest.domain, "trust_professionalism");
assert.equal(weakest.type, "importance", "Within a weak topic, cover its least-practised question type");
assert.equal(weakest.accuracy, 38);
assert.equal(recommendSJTDrill([{ ...row("trust_professionalism", "ranking", 0), completed: false }]).reason, "starting_point", "Partial attempts must not distort recommendations");
console.log("SJT recommendation checks passed: overdue-independent weakness, coverage and sparse-data fallbacks.");
