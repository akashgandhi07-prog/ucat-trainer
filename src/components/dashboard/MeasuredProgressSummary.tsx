import { useEffect, useMemo, useState } from "react";
import type { SessionRow } from "../../types/session";
import { accuracyByDifficulty, compareLikeForLike, compareSpeedWithAccuracy } from "../../lib/progressComparisons";
import { loadSJTReviewStats } from "../../lib/sjtReview";

type Props = { sessions: SessionRow[]; userId: string };

export default function MeasuredProgressSummary({ sessions, userId }: Props) {
  const [cleared, setCleared] = useState(() => loadSJTReviewStats(userId).cleared);
  useEffect(() => {
    const update = () => setCleared(loadSJTReviewStats(userId).cleared);
    update();
    window.addEventListener("sjt-review-updated", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("sjt-review-updated", update); window.removeEventListener("storage", update); };
  }, [userId]);

  const accuracy = useMemo(() => compareLikeForLike(sessions), [sessions]);
  const difficulties = useMemo(() => accuracyByDifficulty(sessions), [sessions]);
  const speed = useMemo(
    () => compareSpeedWithAccuracy(sessions.filter((session) => session.training_type === "speed_reading")),
    [sessions],
  );

  if (!accuracy && !difficulties.length && !speed && cleared === 0) return null;
  const deltaLabel = accuracy ? `${accuracy.delta > 0 ? "+" : ""}${accuracy.delta} points` : null;

  return (
    <section aria-labelledby="measured-progress-title" className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 id="measured-progress-title" className="font-semibold text-foreground">Measured progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">Based only on your completed saved drills. Percentages combine the questions answered, so longer drills carry the right weight.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Like-for-like progress</p>
          {accuracy ? <>
            <p className="mt-1 text-2xl font-bold text-foreground">{accuracy.recent}%</p>
            <p className="text-xs text-muted-foreground">Previous {accuracy.previous}% · {deltaLabel}</p>
            <p className="mt-1 text-[10px] capitalize text-muted-foreground">{accuracy.trainingType.replaceAll("_", " ")} · {accuracy.difficulty}</p>
          </> : <p className="mt-2 text-sm text-muted-foreground">Complete 10 drills in the same trainer and difficulty to compare equal windows.</p>}
        </div>
        <div className="rounded-lg bg-secondary p-4 sm:col-span-1 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accuracy by difficulty</p>
          {difficulties.length ? <div className="mt-2 grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as const).map((level) => {
              const item = difficulties.find((entry) => entry.difficulty === level);
              return <div key={level}>
                <p className="text-xs capitalize text-muted-foreground">{level}</p>
                {item ? <p className="font-bold text-foreground">{item.accuracy}%</p> : <p className="text-sm text-muted-foreground">No data</p>}
                {item && <p className="text-[10px] text-muted-foreground">{item.correct}/{item.total}</p>}
              </div>;
            })}
          </div> : <p className="mt-2 text-sm text-muted-foreground">Difficulty data will appear after a scored easy, medium or hard drill.</p>}
        </div>
        <div className="rounded-lg bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mistakes cleared</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{cleared}</p>
          <p className="text-xs text-muted-foreground">After two successful delayed SJT retries</p>
        </div>
      </div>
      {speed && <div className="mt-3 rounded-lg border border-border px-4 py-3 text-sm">
        {speed.accuracyStable
          ? <p><span className="font-semibold text-foreground">Reading speed with stable accuracy:</span> {speed.recentWpm} WPM, {speed.wpmDelta > 0 ? "+" : ""}{speed.wpmDelta} vs the previous five; accuracy {speed.recentAccuracy}% vs {speed.previousAccuracy}%.</p>
          : <p><span className="font-semibold text-foreground">Protect comprehension:</span> recent speed was {speed.recentWpm} WPM, but accuracy changed from {speed.previousAccuracy}% to {speed.recentAccuracy}%. Speed is not counted as an improvement.</p>}
      </div>}
    </section>
  );
}
