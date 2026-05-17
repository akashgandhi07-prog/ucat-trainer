interface DashboardHeroCardProps {
  name: string;
  streak: number;
  lastPracticedDaysAgo: number | null;
  examDateISO: string | null;
  totalSessions: number;
  uniqueDaysInLast7: number;
  onSetExamDate?: () => void;
  onEditExamDate?: () => void;
}

function getDaysUntilExam(examDateISO: string | null): number | null {
  if (!examDateISO) return null;
  const exam = new Date(examDateISO);
  exam.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((exam.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 0 ? diff : null;
}

type Tone = "positive" | "neutral" | "urgent" | "warning";

function getEncouragement({
  streak,
  lastPracticedDaysAgo,
  daysUntilExam,
  totalSessions,
  uniqueDaysInLast7,
}: {
  streak: number;
  lastPracticedDaysAgo: number | null;
  daysUntilExam: number | null;
  totalSessions: number;
  uniqueDaysInLast7: number;
}): { headline: string; subtext: string; tone: Tone } {
  if (daysUntilExam != null && daysUntilExam <= 3) {
    return {
      headline: `Exam in ${daysUntilExam === 0 ? "less than a day" : `${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"}`}.`,
      subtext: "Trust your preparation. Stay calm, breathe, and do your best.",
      tone: "urgent",
    };
  }
  if (daysUntilExam != null && daysUntilExam <= 14) {
    return {
      headline: `${daysUntilExam} days to go. Final push.`,
      subtext: "Focus on your weak spots, keep sessions short and sharp.",
      tone: "urgent",
    };
  }
  if (totalSessions === 0) {
    return {
      headline: "Ready to start?",
      subtext: "Complete your first session to begin tracking your progress.",
      tone: "neutral",
    };
  }
  if (lastPracticedDaysAgo != null && lastPracticedDaysAgo >= 5) {
    return {
      headline: `${lastPracticedDaysAgo} days since your last session.`,
      subtext: "Jump back in. Even one short session gets the momentum going again.",
      tone: "warning",
    };
  }
  if (streak >= 10) {
    return {
      headline: `${streak}-day streak. Exceptional.`,
      subtext: "Daily consistency like this is exactly what top scorers do.",
      tone: "positive",
    };
  }
  if (streak >= 5) {
    return {
      headline: `${streak}-day streak. You're on a roll.`,
      subtext: "Keep it going. Consistency compounds over time.",
      tone: "positive",
    };
  }
  if (streak >= 3) {
    return {
      headline: `${streak}-day streak. Nice work.`,
      subtext: "You're building a solid practice habit.",
      tone: "positive",
    };
  }
  if (uniqueDaysInLast7 >= 5) {
    return {
      headline: "Consistent week.",
      subtext: "You've practiced most days this week. That's what separates serious candidates.",
      tone: "positive",
    };
  }
  if (uniqueDaysInLast7 >= 3) {
    return {
      headline: "Good progress this week.",
      subtext: "Keep it up. Aim for a session every day if you can.",
      tone: "positive",
    };
  }
  return {
    headline: "Good to see you.",
    subtext: "Check your stats below and pick a trainer to work on.",
    tone: "neutral",
  };
}

const toneStyles: Record<Tone, { bar: string; badge: string; text: string }> = {
  positive: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
  },
  neutral: {
    bar: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-700",
  },
  urgent: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-800",
  },
  warning: {
    bar: "bg-orange-400",
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    text: "text-orange-800",
  },
};

export default function DashboardHeroCard({
  name,
  streak,
  lastPracticedDaysAgo,
  examDateISO,
  totalSessions,
  uniqueDaysInLast7,
  onSetExamDate,
  onEditExamDate,
}: DashboardHeroCardProps) {
  const daysUntilExam = getDaysUntilExam(examDateISO);
  const enc = getEncouragement({
    streak,
    lastPracticedDaysAgo,
    daysUntilExam,
    totalSessions,
    uniqueDaysInLast7,
  });
  const styles = toneStyles[enc.tone];

  const examProgress =
    daysUntilExam != null
      ? Math.max(0, Math.min(100, Math.round((1 - daysUntilExam / 365) * 100)))
      : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tone accent bar */}
      <div className={`h-1 w-full ${styles.bar}`} />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: greeting + encouragement */}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
              {name !== "Future Clinician" ? `Hey, ${name.split(" ")[0]}.` : "Your dashboard."}
            </h2>
            <p className="text-base font-semibold text-slate-800">{enc.headline}</p>
            <p className="text-sm text-slate-500 mt-0.5">{enc.subtext}</p>
          </div>

          {/* Right: stat pills */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-2 shrink-0">
            {streak > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${styles.badge}`}
              >
                <span>{streak}-day streak</span>
              </span>
            )}
            {daysUntilExam != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 overflow-hidden">
                <span className="px-3 py-1.5">
                  {daysUntilExam === 0 ? "Exam today" : `${daysUntilExam}d to exam`}
                </span>
                {onEditExamDate && (
                  <button
                    type="button"
                    onClick={onEditExamDate}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-200 text-xs"
                    aria-label="Edit exam date"
                  >
                    Edit
                  </button>
                )}
              </span>
            ) : onSetExamDate ? (
              <button
                type="button"
                onClick={onSetExamDate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Set exam date
              </button>
            ) : null}
            {totalSessions > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 bg-slate-50 text-slate-600">
                <span>{totalSessions}</span>
                <span>session{totalSessions !== 1 ? "s" : ""} total</span>
              </span>
            )}
          </div>
        </div>

        {/* Exam countdown bar */}
        {examProgress != null && daysUntilExam != null && daysUntilExam > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Exam preparation</span>
              <span>{daysUntilExam} day{daysUntilExam !== 1 ? "s" : ""} remaining</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
                style={{ width: `${examProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
