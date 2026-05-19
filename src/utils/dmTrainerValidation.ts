import type {
  ArgumentJudgeReview,
  DmTrainerOptionId,
  DmTrainerQuestion,
} from "../types/dmTrainers";
import { isArgumentJudgeReview } from "../types/dmTrainers";
import { DM_TRAINER_TYPES, DM_TRAINER_CONFIGS } from "../data/dmTrainers/trainerConfig";

const OPTION_IDS: DmTrainerOptionId[] = ["A", "B", "C", "D"];

export type DmTrainerValidationIssue = {
  questionId: string;
  message: string;
};

function assertOptions(question: DmTrainerQuestion, issues: DmTrainerValidationIssue[]): void {
  if (question.options.length !== 4) {
    issues.push({
      questionId: question.id,
      message: `Expected 4 options, found ${question.options.length}.`,
    });
    return;
  }
  const ids = question.options.map((o) => o.id);
  for (const id of OPTION_IDS) {
    if (!ids.includes(id)) {
      issues.push({ questionId: question.id, message: `Missing option ${id}.` });
    }
  }
  if (!ids.includes(question.correctAnswer)) {
    issues.push({
      questionId: question.id,
      message: `correctAnswer ${question.correctAnswer} is not among option ids.`,
    });
  }
}

function validateArgumentJudgeReview(
  question: DmTrainerQuestion,
  review: ArgumentJudgeReview,
  issues: DmTrainerValidationIssue[],
): void {
  const required = [
    "exactAim",
    "whyCorrect",
    "whyAIsWrong",
    "whyBIsWrong",
    "whyCIsWrong",
    "whyDIsWrong",
  ] as const;
  for (const key of required) {
    if (!review[key]?.trim()) {
      issues.push({ questionId: question.id, message: `Missing review.${key}.` });
    }
  }
  if (review.ambiguityRisk !== "low") {
    issues.push({
      questionId: question.id,
      message: `ambiguityRisk must be low, got ${review.ambiguityRisk}.`,
    });
  }
  for (const opt of question.options) {
    if (!opt.label?.trim()) {
      issues.push({
        questionId: question.id,
        message: `Argument Judge option ${opt.id} missing label.`,
      });
    }
  }
}

export function validateDmTrainerQuestion(question: DmTrainerQuestion): DmTrainerValidationIssue[] {
  const issues: DmTrainerValidationIssue[] = [];

  if (question.trainerType === "argument-judge" && !isArgumentJudgeReview(question.review)) {
    issues.push({
      questionId: question.id,
      message: "Argument Judge question must include full review object.",
    });
  }

  if (isArgumentJudgeReview(question.review)) {
    validateArgumentJudgeReview(question, question.review, issues);
  } else if (question.review.ambiguityRisk !== "low") {
    issues.push({
      questionId: question.id,
      message: `ambiguityRisk must be low, got ${question.review.ambiguityRisk}.`,
    });
  }

  assertOptions(question, issues);

  if (!question.explanation.trim()) {
    issues.push({ questionId: question.id, message: "Missing explanation." });
  }
  if (!question.skillTag.trim()) {
    issues.push({ questionId: question.id, message: "Missing skillTag." });
  }
  if (!question.commonTrap.trim()) {
    issues.push({ questionId: question.id, message: "Missing commonTrap." });
  }

  return issues;
}

export function validateAllDmTrainerQuestions(): DmTrainerValidationIssue[] {
  const issues: DmTrainerValidationIssue[] = [];

  for (const type of DM_TRAINER_TYPES) {
    const config = DM_TRAINER_CONFIGS[type];
    if (config.questions.length < 5 || config.questions.length % 5 !== 0) {
      issues.push({
        questionId: type,
        message: `${config.title} must have reviewed questions in batches of 5 (found ${config.questions.length}).`,
      });
    }
    const ids = new Set<string>();
    for (const q of config.questions) {
      if (q.trainerType !== type) {
        issues.push({
          questionId: q.id,
          message: `trainerType ${q.trainerType} does not match config ${type}.`,
        });
      }
      if (ids.has(q.id)) {
        issues.push({ questionId: q.id, message: "Duplicate question id." });
      }
      ids.add(q.id);
      issues.push(...validateDmTrainerQuestion(q));
    }
  }

  return issues;
}
