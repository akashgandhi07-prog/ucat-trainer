import type { TrainingType } from "../types/training";

/**
 * Short, actionable tips shown one per context (speed reading, rapid recall, keyword scanning).
 * Picked at random or by index to rotate.
 */
export const TIPS: Record<TrainingType, string[]> = {
  speed_reading: [
    "Focus on the centre of each chunk; your peripheral vision catches the rest.",
    "Keep a steady pace; avoid pausing on every word.",
    "Aim for main ideas first; details stick when the structure is clear.",
  ],
  rapid_recall: [
    "First read for main idea and structure; details stick better.",
    "Notice signal words (however, therefore, first) to follow the argument.",
    "Mentally summarise each paragraph in one phrase as you read.",
  ],
  keyword_scanning: [
    "Scan in patterns (e.g. left-to-right lines) instead of random jumping.",
    "Use your finger or cursor to keep your place and pace.",
    "Ignore words you don't need; only stop on possible matches.",
  ],
  calculator: [
    "Use the numpad for speed; keep your hand in a fixed position.",
    "Practise common operations (percentages, fractions) until they're automatic.",
    "Estimate first to catch key-entry errors before submitting.",
  ],
};

function pickTip(tips: string[], seed?: number): string {
  const i = seed != null ? seed % tips.length : Math.floor(Math.random() * tips.length);
  return tips[i];
}

/**
 * Returns one tip for the given training type. Pass a seed (e.g. session count or date) for stable rotation.
 */
export function getTipForMode(mode: TrainingType, seed?: number): string {
  return pickTip(TIPS[mode], seed);
}
