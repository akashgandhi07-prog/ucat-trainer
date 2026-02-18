export type TrainingType = "speed_reading" | "rapid_recall" | "keyword_scanning" | "calculator" | "inference_trainer";

export type TrainingDifficulty = "easy" | "medium" | "hard";

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  speed_reading: "Speed Reading",
  rapid_recall: "Rapid Recall",
  keyword_scanning: "Keyword Scanning",
  calculator: "Calculator Trainer",
  inference_trainer: "Inference Trainer",
};

export const TRAINING_DIFFICULTY_LABELS: Record<TrainingDifficulty, string> = {
  easy: "Easier",
  medium: "Standard",
  hard: "Challenging",
};
