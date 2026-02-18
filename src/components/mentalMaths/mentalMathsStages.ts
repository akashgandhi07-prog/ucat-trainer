export interface MentalMathsStageConfig {
  id: number;
  name: string;
  requiredAccuracy: number;
  maxAvgTimeMs: number;
  questionCount: number;
}

export const MENTAL_MATHS_STAGES: MentalMathsStageConfig[] = [
  { id: 0, name: "Stage 1: Times tables & basics", requiredAccuracy: 80, maxAvgTimeMs: 8000, questionCount: 8 },
  { id: 1, name: "Stage 2: Percentages & shortcuts", requiredAccuracy: 80, maxAvgTimeMs: 10000, questionCount: 8 },
  { id: 2, name: "Stage 3: Rapid estimation", requiredAccuracy: 75, maxAvgTimeMs: 15000, questionCount: 6 },
  { id: 3, name: "Stage 4: Word problems", requiredAccuracy: 75, maxAvgTimeMs: 20000, questionCount: 6 },
];

const STORAGE_KEY = "ucat_mental_maths_stage";

export function getHighestUnlockedStage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) || n < 0 ? 0 : Math.min(n, MENTAL_MATHS_STAGES.length - 1);
  } catch {
    return 0;
  }
}

export function setHighestUnlockedStage(stageIndex: number): void {
  try {
    const clamped = Math.max(0, Math.min(stageIndex, MENTAL_MATHS_STAGES.length - 1));
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    // ignore
  }
}

export function difficultyFromStageIndex(stageIndex: number): "stage_1" | "stage_2" | "stage_3" | "stage_4" {
  const map: ("stage_1" | "stage_2" | "stage_3" | "stage_4")[] = ["stage_1", "stage_2", "stage_3", "stage_4"];
  return map[Math.max(0, Math.min(stageIndex, 3))];
}
