import { validateAllDmTrainerQuestions } from "../src/utils/dmTrainerValidation";

const issues = validateAllDmTrainerQuestions();

if (issues.length > 0) {
  console.error("DM trainer question validation failed:\n");
  for (const issue of issues) {
    console.error(`  [${issue.questionId}] ${issue.message}`);
  }
  process.exit(1);
}

console.log("All DM trainer seed questions passed validation.");
