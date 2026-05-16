import type { SessionRow } from "../../types/session";
import type { SyllogismSession } from "../../types/syllogisms";
import { TRAINING_TYPE_LABELS } from "../../types/training";
import type { TrainingType } from "../../types/training";

interface WeekSummaryCardProps {
  sessions: SessionRow[];
  syllogismSessions: SyllogismSession[];
}

function getTrainingType(s: SessionRow): TrainingType {
  const t = s.training_type;
  if (
    t === "speed_reading" ||
    t === "rapid_recall" ||
    t === "keyword_scanning" ||
    t === "calculator" ||
    t === "inference_trainer" ||
    t === "mental_maths"
  )
    return t;
  return "speed_reading";
}

function startOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function WeekSummaryCard({ sessions, syllogismSessions }: WeekSummaryCardProps) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = now - sevenDaysMs;

  const thisWeekSessions = sessions.filter(
    (s) => new Date(s.created_at).getTime() >= weekStart
  );
  const thisWeekSyllogisms = syllogismSessions.filter(
    (s) => new Date(s.created_at).getTime() >= weekStart
  );

  const totalThisWeek = thisWeekSessions.length + thisWeekSyllogisms.length;

  const uniqueDays = new Set<number>();
  for (const s of thisWeekSessions) {
    uniqueDays.add(startOfDayMs(new Date(s.created_at)));
  }
  for (const s of thisWeekSyllogisms) {
    uniqueDays.add(startOfDayMs(new Date(s.created_at)));
  }

  // Most practiced trainer this week
  const typeCounts: Partial<Record<TrainingType | "syllogism", number>> = {};
  for (const s of thisWeekSessions) {
    const t = getTrainingType(s);
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  if (thisWeekSyllogisms.length > 0) {
    typeCounts["syllogism"] = thisWeekSyllogisms.length;
  }
  const topEntry = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];
  const topTrainer =
    topEntry != null
      ? topEntry[0] === "syllogism"
        ? "Decision Making"
        : TRAINING_TYPE_LABELS[topEntry[0] as TrainingType] ?? topEntry[0]
      : null;

  // Best accuracy score this week (across scored sessions)
  let bestPct: number | null = null;
  for (const s of thisWeekSessions) {
    if (s.total > 0) {
      const pct = Math.round((s.correct / s.total) * 100);
      if (bestPct == null || pct > bestPct) bestPct = pct;
    }
  }
  for (const s of thisWeekSyllogisms) {
    if (s.total_questions > 0) {
      const pct = Math.round((s.score / s.total_questions) * 100);
      if (bestPct == null || pct > bestPct) bestPct = pct;
    }
  }

  // Vs previous week
  const prevWeekSessions = sessions.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= weekStart - sevenDaysMs && t < weekStart;
  });
  const prevWeekTotal = prevWeekSessions.length +
    syllogismSessions.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= weekStart - sevenDaysMs && t < weekStart;
    }).length;

  const sessionDelta = totalThisWeek - prevWeekTotal;

  // Day-of-week mini dots (Mon-Sun)
  const dayDots: boolean[] = [];
  const todayDay = new Date().getDay(); // 0=Sun
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const ms = d.getTime();
    const had =
      sessions.some((s) => startOfDayMs(new Date(s.created_at)) === ms) ||
      syllogismSessions.some((s) => startOfDayMs(new Date(s.created_at)) === ms);
    dayDots.push(had);
  }
  void todayDay;

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Align dots to Mon-Sun
  const dotLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    dotLabels.push(DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]);
  }

  if (totalThisWeek === 0 && prevWeekTotal === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-900 mb-4">This week</h2>

      {/* Activity dots */}
      <div className="flex gap-1.5 mb-5">
        {dayDots.map((active, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-full h-6 rounded-md transition-colors ${
                active ? "bg-blue-500" : "bg-slate-100"
              }`}
            />
            <span className="text-[10px] text-slate-400">{dotLabels[i]}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {uniqueDays.size}
            <span className="text-base font-normal text-slate-400">/7</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Days active</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {totalThisWeek}
            {prevWeekTotal > 0 && sessionDelta !== 0 && (
              <span
                className={`text-sm font-semibold ml-1 ${
                  sessionDelta > 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {sessionDelta > 0 ? "+" : ""}
                {sessionDelta}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Sessions</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {bestPct != null ? `${bestPct}%` : "-"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Best score</p>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {topTrainer ?? "-"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Top trainer</p>
        </div>
      </div>

      {totalThisWeek === 0 && prevWeekTotal > 0 && (
        <p className="mt-4 text-sm text-slate-500 text-center">
          No sessions yet this week. You did {prevWeekTotal} last week.
        </p>
      )}
    </div>
  );
}
