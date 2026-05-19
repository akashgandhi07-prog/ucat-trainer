/**
 * Dashboard analytics for Decision Making (Syllogisms). UK English.
 */

import { Link } from "react-router-dom";
import type { SyllogismSession } from "../../types/syllogisms";
import type { LogicGroup } from "../../types/syllogisms";

const LOGIC_GROUP_LABELS: Record<LogicGroup, string> = {
  categorical: "Categorical",
  relative: "Relative",
  majority: "Majority",
  complex: "Complex",
};

const SLOW_DECISION_THRESHOLD_SECONDS = 10;

/** Derive total correct from session score: linear modes store correct; macro stores 0/1/2 for 5 questions. */
function correctFromSession(s: SyllogismSession): number {
  if (s.mode === "micro" || s.mode === "foundation") return s.score;
  if (s.mode === "macro" && s.total_questions === 5) {
    if (s.score === 2) return 5;
    if (s.score === 1) return 4;
    return 0;
  }
  return s.score;
}

type Props = { sessions: SyllogismSession[] };

export default function SyllogismAnalytics({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Decision Making - Syllogisms</h3>
        <p className="text-muted-foreground text-sm">
          No syllogism sessions yet. Complete a few foundations, micro or macro drills to see your accuracy and speed here.
        </p>
        <Link
          to="/decision-making"
          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go to Syllogisms Trainer
        </Link>
      </div>
    );
  }

  const totalQuestions = sessions.reduce((sum, s) => sum + s.total_questions, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + correctFromSession(s), 0);
  const overallAccuracyPct =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const weightedTimeSum = sessions.reduce(
    (sum, s) => sum + s.average_time_per_decision * s.total_questions,
    0
  );
  const averageTimePerDecision =
    totalQuestions > 0 ? weightedTimeSum / totalQuestions : 0;
  const isSlow = averageTimePerDecision > SLOW_DECISION_THRESHOLD_SECONDS;

  const groupKeys: LogicGroup[] = ["categorical", "relative", "majority", "complex"];
  const groupAccuracy: Record<LogicGroup, number | null> = {
    categorical: null,
    relative: null,
    majority: null,
    complex: null,
  };
  let weightSum = 0;
  for (const g of groupKeys) {
    let weightedSum = 0;
    let w = 0;
    for (const s of sessions) {
      const v =
        g === "categorical"
          ? s.categorical_accuracy
          : g === "relative"
            ? s.relative_accuracy
            : g === "majority"
              ? s.majority_accuracy
              : s.complex_accuracy;
      if (typeof v === "number" && !Number.isNaN(v)) {
        weightedSum += v * s.total_questions;
        w += s.total_questions;
      }
    }
    groupAccuracy[g] = w > 0 ? weightedSum / w : null;
    if (w > 0) weightSum += w;
  }

  let weakestGroup: LogicGroup | null = null;
  let weakestPct = 101;
  for (const g of groupKeys) {
    const pct = groupAccuracy[g];
    if (pct != null && pct < weakestPct) {
      weakestPct = pct;
      weakestGroup = g;
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Decision Making - Syllogisms</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-sm font-medium text-muted-foreground">Overall accuracy</p>
          <p className="text-2xl font-bold text-foreground">{overallAccuracyPct}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCorrect} of {totalQuestions} correct across all sessions
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-sm font-medium text-muted-foreground">Average time per decision</p>
          <p
            className={`text-2xl font-bold ${isSlow ? "text-amber-600" : "text-foreground"}`}
          >
            {averageTimePerDecision.toFixed(1)}s
          </p>
          {isSlow && (
            <p className="text-sm text-amber-600 mt-1">
              Decisions are taking too long - aim for under 10 seconds per judgement.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-4">
        {groupKeys.map((g) => {
          const pct = groupAccuracy[g];
          const displayPct = pct != null ? Math.round(pct * 100) : null;
          return (
            <div key={g} className="bg-white rounded-lg border border-border p-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-foreground">
                  {LOGIC_GROUP_LABELS[g]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {displayPct != null ? `${displayPct}%` : "No data"}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: displayPct != null ? `${displayPct}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {weakestGroup != null && weakestPct < 100 && (
        <p className="text-sm text-foreground border-t border-border pt-4">
          Your weakest area is <strong>{LOGIC_GROUP_LABELS[weakestGroup]}</strong> logic (
          {Math.round(weakestPct)}%). Focus your revision on{" "}
          {weakestGroup === "categorical" && "universal statements and chained inferences."}
          {weakestGroup === "relative" && "relative overlaps and partial information."}
          {weakestGroup === "majority" && "majority overlap and necessary vs possible conclusions."}
          {weakestGroup === "complex" && "conditionals, contrapositive, and converse traps."}
        </p>
      )}
      {weightSum === 0 && (
        <p className="text-sm text-muted-foreground border-t border-border pt-4">
          Complete a few syllogism drills to unlock targeted advice by logic type.
        </p>
      )}
    </div>
  );
}
