export type DmTrainerType = "venn-logic" | "data-logic" | "argument-judge";

export type DmTrainerDifficulty = "easy" | "medium" | "hard";

export type DmTrainerOptionId = "A" | "B" | "C" | "D";

export type ArgumentJudgeOptionLabel =
  | "directly-relevant"
  | "partially-relevant"
  | "true-but-irrelevant"
  | "too-narrow"
  | "unsupported-assumption"
  | "overclaim"
  | "vague"
  | "does-not-answer-aim"
  | "only-addresses-one-criterion";

export interface DmTrainerOption {
  id: DmTrainerOptionId;
  text: string;
  label?: ArgumentJudgeOptionLabel;
}

export interface DmTrainerReviewBase {
  calculationChecked?: boolean;
  ambiguityRisk: "low";
  whySafeToInclude: string;
}

export interface ArgumentJudgeReview extends DmTrainerReviewBase {
  exactAim: string;
  whyCorrect: string;
  whyAIsWrong: string;
  whyBIsWrong: string;
  whyCIsWrong: string;
  whyDIsWrong: string;
}

export interface DmTrainerQuestion {
  id: string;
  dbId?: string;    // trainer_questions UUID — used for submitting reports
  trainerType: DmTrainerType;
  difficulty: DmTrainerDifficulty;
  beta?: boolean;
  stem: string;
  question: string;
  options: DmTrainerOption[];
  correctAnswer: DmTrainerOptionId;
  explanation: string;
  generalRule?: string;
  wrongOptionReasons?: Partial<Record<DmTrainerOptionId, string>>;
  keyInsight?: string;
  skillTag: string;
  commonTrap: string;
  optionalWorkingSteps?: string[];
  review: DmTrainerReviewBase | ArgumentJudgeReview;
}

export interface DmTrainerSessionAnswer {
  questionId: string;
  selected: DmTrainerOptionId | null;
  correct: boolean;
  skillTag: string;
}

export interface DmTrainerSessionSummary {
  trainerType: DmTrainerType;
  correct: number;
  total: number;
  elapsedSeconds: number;
  answers: DmTrainerSessionAnswer[];
  completedAt: string;
}

export function isArgumentJudgeReview(
  review: DmTrainerReviewBase | ArgumentJudgeReview,
): review is ArgumentJudgeReview {
  return "exactAim" in review;
}
