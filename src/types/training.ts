export type TrainingType = "speed_reading" | "rapid_recall" | "keyword_scanning";

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  speed_reading: "Speed Reading",
  rapid_recall: "Rapid Recall",
  keyword_scanning: "Keyword Scanning",
};
