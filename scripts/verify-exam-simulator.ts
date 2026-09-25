import assert from "node:assert/strict";
import { sample } from "../src/exam-simulator/sample";
import { fullShell } from "../src/exam-simulator/fullShell";
import {
  assign,
  bankSchema,
  complete,
  examShortcut,
} from "../src/exam-simulator/model";
assert.equal(sample.sections.length, 4);
assert.deepEqual(
  fullShell.sections.map((section) => [section.id, section.questions.length]),
  [
    ["VR", 44],
    ["DM", 35],
    ["QR", 36],
    ["SJT", 69],
  ],
);
assert.equal(
  new Set(
    fullShell.sections.flatMap((section) =>
      section.questions.map((question) => question.id),
    ),
  ).size,
  184,
);
assert.deepEqual(
  fullShell.sections.map((section) => section.durationSeconds),
  [1320, 2220, 1560, 1560],
);
assert.equal(complete(sample.sections[0].questions[0], { choice: "A" }), true);
const dm = sample.sections[1].questions[0];
assert.equal(complete(dm, { "0": "Yes" }), false);
assert.equal(
  complete(dm, { "0": "Yes", "1": "No", "2": "Yes", "3": "No", "4": "Yes" }),
  true,
);
const sjt = sample.sections[3].questions[2];
assert.equal(complete(sjt, { most: "A", least: "A" }), false);
assert.equal(complete(sjt, { most: "A", least: "B" }), true);
assert.deepEqual(assign({ most: "A", least: "B" }, "least", "A", true), {
  least: "A",
});
assert.deepEqual(assign({ "0": "Yes" }, "1", "Yes", false), {
  "0": "Yes",
  "1": "Yes",
});
const duplicate = structuredClone(sample);
duplicate.sections[0].questions[1].id = "vr1";
assert.equal(bankSchema.safeParse(duplicate).success, false);
const missing = structuredClone(sample);
delete missing.sections[1].questions[0].statements;
assert.equal(bankSchema.safeParse(missing).success, false);
const image = structuredClone(sample);
image.sections[0].questions[0].image = "https://example.com/track";
assert.equal(bankSchema.safeParse(image).success, false);
assert.equal(examShortcut({ key: "N", altKey: true }), "next");
assert.equal(examShortcut({ key: "c", altKey: true }), "calculator");
assert.equal(examShortcut({ key: "e", altKey: true }), "end-review");
assert.equal(examShortcut({ key: "a", altKey: true }), "review-all");
assert.equal(examShortcut({ key: "n", altKey: false }), null);
assert.equal(examShortcut({ key: "n", altKey: true, repeat: true }), null);
console.log(
  "Simulator checks passed: bank validation, completion, shortcuts, unique ranking, reusable Yes/No tiles.",
);
