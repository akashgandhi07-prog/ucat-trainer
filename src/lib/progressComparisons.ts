export type ScoredRow = { correct: number; total: number };

export type AccuracyComparison = {
  recent: number;
  previous: number;
  delta: number;
  recentCorrect: number;
  recentTotal: number;
  previousCorrect: number;
  previousTotal: number;
};

function validScore(row: ScoredRow): boolean {
  return Number.isFinite(row.correct) && Number.isFinite(row.total) && row.total > 0 && row.correct >= 0 && row.correct <= row.total;
}

function totals(rows: ScoredRow[]) {
  return rows.reduce((sum, row) => ({ correct: sum.correct + row.correct, total: sum.total + row.total }), { correct: 0, total: 0 });
}

export function compareAccuracyWindows<T extends ScoredRow>(rows: T[], windowSize = 5): AccuracyComparison | null {
  const valid = rows.filter(validScore);
  if (valid.length < windowSize * 2) return null;
  const previousRows = valid.slice(-windowSize * 2, -windowSize);
  const recentRows = valid.slice(-windowSize);
  const previous = totals(previousRows);
  const recent = totals(recentRows);
  const recentPct = Math.round((recent.correct / recent.total) * 100);
  const previousPct = Math.round((previous.correct / previous.total) * 100);
  return {
    recent: recentPct,
    previous: previousPct,
    delta: recentPct - previousPct,
    recentCorrect: recent.correct,
    recentTotal: recent.total,
    previousCorrect: previous.correct,
    previousTotal: previous.total,
  };
}

export type LikeForLikeComparison = AccuracyComparison & { trainingType: string; difficulty: string };

export function compareLikeForLike<T extends ScoredRow & { training_type: string; difficulty?: string | null; created_at: string }>(rows: T[], windowSize = 5): LikeForLikeComparison | null {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.difficulty || !validScore(row)) continue;
    const groupKey = `${row.training_type}:${row.difficulty}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }
  return [...groups.entries()].flatMap(([groupKey, items]) => {
    const ordered = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const comparison = compareAccuracyWindows(ordered, windowSize);
    if (!comparison) return [];
    const splitAt = groupKey.lastIndexOf(":");
    return [{ ...comparison, trainingType: groupKey.slice(0, splitAt), difficulty: groupKey.slice(splitAt + 1), latest: ordered.at(-1)!.created_at }];
  }).sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())[0] ?? null;
}

export type DifficultyAccuracy = { difficulty: "easy" | "medium" | "hard"; correct: number; total: number; accuracy: number; sessions: number };

export function accuracyByDifficulty<T extends ScoredRow & { difficulty?: string | null }>(rows: T[]): DifficultyAccuracy[] {
  return (["easy", "medium", "hard"] as const).flatMap((difficulty) => {
    const matches = rows.filter((row) => row.difficulty === difficulty && validScore(row));
    if (!matches.length) return [];
    const aggregate = totals(matches);
    return [{ difficulty, ...aggregate, accuracy: Math.round((aggregate.correct / aggregate.total) * 100), sessions: matches.length }];
  });
}

export type SpeedComparison = {
  recentWpm: number;
  previousWpm: number;
  wpmDelta: number;
  recentAccuracy: number;
  previousAccuracy: number;
  accuracyStable: boolean;
};

export function compareSpeedWithAccuracy<T extends ScoredRow & { wpm: number | null }>(rows: T[], windowSize = 5, tolerancePoints = 2): SpeedComparison | null {
  const valid = rows.filter((row) => validScore(row) && Number.isFinite(row.wpm) && (row.wpm ?? 0) > 0);
  if (valid.length < windowSize * 2) return null;
  const previousRows = valid.slice(-windowSize * 2, -windowSize);
  const recentRows = valid.slice(-windowSize);
  const accuracy = compareAccuracyWindows(valid, windowSize)!;
  const meanWpm = (items: T[]) => Math.round(items.reduce((sum, row) => sum + (row.wpm ?? 0), 0) / items.length);
  const recentWpm = meanWpm(recentRows);
  const previousWpm = meanWpm(previousRows);
  return {
    recentWpm,
    previousWpm,
    wpmDelta: recentWpm - previousWpm,
    recentAccuracy: accuracy.recent,
    previousAccuracy: accuracy.previous,
    accuracyStable: accuracy.recent >= accuracy.previous - tolerancePoints,
  };
}
