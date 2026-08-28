/**
 * Runs the distortion engine over every passage and reports statements that read
 * as broken English. The engine is randomised, so each passage is generated many
 * times to cover the different strategy orders and sentence picks.
 *
 *   npm run verify:distortion            # default 40 runs per passage
 *   npm run verify:distortion -- 200     # deeper sweep
 */

import { PASSAGES } from "../src/data/passages";
import { buildQuestions } from "../src/utils/distortionEngine";
import { checkStatement, type OutputProblem } from "../src/utils/distortionOutputChecks";

const RUNS_PER_PASSAGE = Number(process.argv[2]) || 40;
const QUESTIONS_PER_RUN = 4;

type Finding = OutputProblem & { passageId: string };

function main() {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  let statementCount = 0;

  for (const passage of PASSAGES) {
    for (let run = 0; run < RUNS_PER_PASSAGE; run++) {
      const questions = buildQuestions(passage.text, QUESTIONS_PER_RUN, passage.title);
      const statements = questions.flatMap((question) =>
        question.kind === "tfct"
          ? [question.displayedSentence]
          : question.options.map((option) => option.text)
      );
      statementCount += statements.length;
      for (const statement of statements) {
        for (const problem of checkStatement(statement)) {
          const key = `${problem.rule}::${problem.statement}`;
          if (seen.has(key)) continue;
          seen.add(key);
          findings.push({ ...problem, passageId: passage.id });
        }
      }
    }
  }

  console.log(
    `Checked ${statementCount} generated statements across ${PASSAGES.length} passages (${RUNS_PER_PASSAGE} runs each).`
  );

  if (findings.length > 0) {
    console.error(`\nDistortion engine produced ${findings.length} unusable statement(s):\n`);
    for (const finding of findings) {
      console.error(`  [${finding.passageId}] ${finding.rule}\n      ${finding.statement}`);
    }
    process.exit(1);
  }

  console.log("All generated statements passed the grammar checks.");
}

main();
