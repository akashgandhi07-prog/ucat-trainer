export type StageDifficulty = 'easy' | 'medium' | 'hard';

export interface CalculatorStage {
    id: number;
    name: string;
    difficulty: StageDifficulty;
    questionCount: number;
    requiredAccuracy: number; // 95 or 100 (percent)
}

export const CALCULATOR_STAGES: CalculatorStage[] = [
    { id: 1, name: 'Stage 1: Basics', difficulty: 'easy', questionCount: 5, requiredAccuracy: 100 },
    { id: 2, name: 'Stage 2: Building speed', difficulty: 'easy', questionCount: 8, requiredAccuracy: 100 },
    { id: 3, name: 'Stage 3: UCAT style', difficulty: 'medium', questionCount: 10, requiredAccuracy: 95 },
    { id: 4, name: 'Stage 4: Under pressure', difficulty: 'medium', questionCount: 10, requiredAccuracy: 95 },
    { id: 5, name: 'Stage 5: Exam ready', difficulty: 'hard', questionCount: 10, requiredAccuracy: 95 },
];

const STORAGE_KEY = 'ucat_calculator_stage';

export const getHighestUnlockedStage = (): number => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw == null) return 0;
        const n = parseInt(raw, 10);
        return isNaN(n) || n < 0 ? 0 : Math.min(n, CALCULATOR_STAGES.length - 1);
    } catch {
        return 0;
    }
};

export const setHighestUnlockedStage = (stageIndex: number) => {
    try {
        const clamped = Math.max(0, Math.min(stageIndex, CALCULATOR_STAGES.length - 1));
        localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
        // ignore
    }
};

