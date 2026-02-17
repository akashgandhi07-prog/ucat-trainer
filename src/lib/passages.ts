import { PASSAGES, type Passage } from "../data/passages";
import type { TrainingDifficulty } from "../types/training";

function getDifficultyRange(level?: TrainingDifficulty): [number, number] | null {
  if (!level) return null;
  switch (level) {
    case "easy":
      return [1, 3];
    case "medium":
      return [4, 6];
    case "hard":
      return [7, 10];
    default:
      return null;
  }
}

export function pickNewRandomPassage(
  currentId?: string | null,
  difficulty?: TrainingDifficulty
): Passage {
  if (PASSAGES.length === 0) {
    throw new Error("No passages available");
  }

  const range = getDifficultyRange(difficulty);
  const pool =
    range == null
      ? PASSAGES
      : PASSAGES.filter((p) => p.difficulty >= range[0] && p.difficulty <= range[1]);

  const source = pool.length > 0 ? pool : PASSAGES;

  // If there's only one passage or we don't know the current one,
  // just return a random passage.
  if (source.length === 1 || !currentId) {
    return source[Math.floor(Math.random() * source.length)];
  }

  let next: Passage = source[Math.floor(Math.random() * source.length)];
  let safety = 0;

  // Avoid immediately repeating the same passage when possible.
  while (next.id === currentId && safety < 10) {
    next = source[Math.floor(Math.random() * source.length)];
    safety += 1;
  }

  return next;
}
