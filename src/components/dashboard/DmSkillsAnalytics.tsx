/**
 * Dashboard analytics for the DM skills trainers (Venn Logic, Data Logic, Argument Judge). UK English.
 */

import { Link } from "react-router-dom";
import type { DmTrainerSessionRow } from "../../types/dmTrainers";
import { DM_SKILLS_TRAINERS } from "../../data/dmTrainers/dmSkillsTrainerMeta";

// DM in the real exam is about 35 questions in 37 minutes, roughly 63s per question.
const EXAM_SECONDS_PER_QUESTION = 63;
// A skill needs this many answered questions before it is called out as weak.
const MIN_SKILL_ATTEMPTS = 3;

function humaniseTag(tag: string): string {
  const words = tag.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type TrainerStats = {
  sessions: number;
  correct: number;
  total: number;
  secondsPerQuestion: number | null;
  lastPct: number | null;
  weakestSkills: { tag: string; pct: number; total: number }[];
};

// Retry runs only replay questions already missed, so they are left out of accuracy and pace.
function buildStats(allRows: DmTrainerSessionRow[]): TrainerStats {
  const rows = allRows.filter((r) => !r.retry_mode);
  let correct = 0;
  let total = 0;
  // Thinking time per answer, which excludes time spent reading explanations.
  let timedSeconds = 0;
  let timedAnswers = 0;
  const skills = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    correct += r.score;
    total += r.total_questions;
    for (const a of r.answers ?? []) {
      if (typeof a.timeTakenSeconds === "number" && a.timeTakenSeconds > 0) {
        timedSeconds += a.timeTakenSeconds;
        timedAnswers += 1;
      }
      const tag = a.skillTag || "unknown";
      const s = skills.get(tag) ?? { correct: 0, total: 0 };
      s.total += 1;
      if (a.correct) s.correct += 1;
      skills.set(tag, s);
    }
  }
  const last = rows[rows.length - 1];
  const weakestSkills = [...skills.entries()]
    .filter(([tag, s]) => tag !== "unknown" && s.total >= MIN_SKILL_ATTEMPTS && s.correct < s.total)
    .map(([tag, s]) => ({ tag, pct: Math.round((s.correct / s.total) * 100), total: s.total }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
    .slice(0, 2);
  return {
    sessions: allRows.length,
    correct,
    total,
    secondsPerQuestion: timedAnswers > 0 ? Math.round(timedSeconds / timedAnswers) : null,
    lastPct: last && last.total_questions > 0 ? Math.round((last.score / last.total_questions) * 100) : null,
    weakestSkills,
  };
}

type Props = { sessions: DmTrainerSessionRow[] };

export default function DmSkillsAnalytics({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Decision Making skills</h3>
        <p className="text-muted-foreground text-sm">
          No Venn Logic, Data Logic or Argument Judge drills yet. Finish a drill to see your accuracy, pace and weakest skills here.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {DM_SKILLS_TRAINERS.map((t) => (
            <Link
              key={t.type}
              to={t.path}
              className="inline-flex px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Decision Making skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DM_SKILLS_TRAINERS.map((t) => {
          const rows = sessions.filter((s) => s.trainer_type === t.type);
          if (rows.length === 0) {
            return (
              <div key={t.type} className="bg-white rounded-lg border border-border p-4 flex flex-col">
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-sm text-muted-foreground mt-1 flex-1">Not tried yet.</p>
                <Link to={t.path} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-3">
                  Start a drill →
                </Link>
              </div>
            );
          }
          const s = buildStats(rows);
          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
          const slow = s.secondsPerQuestion != null && s.secondsPerQuestion > EXAM_SECONDS_PER_QUESTION;
          return (
            <div key={t.type} className="bg-white rounded-lg border border-border p-4 flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  {s.sessions} drill{s.sessions !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{pct != null ? `${pct}%` : "-"}</p>
              <p className="text-xs text-muted-foreground">
                {s.correct} of {s.total} correct
                {s.lastPct != null && <> · last drill {s.lastPct}%</>}
              </p>
              {s.secondsPerQuestion != null && (
                <p className={`text-xs mt-1 ${slow ? "text-amber-600" : "text-muted-foreground"}`}>
                  {s.secondsPerQuestion}s per question{slow ? ", slower than exam pace (about 63s)" : ""}
                </p>
              )}
              <div className="mt-3 flex-1">
                {s.weakestSkills.length > 0 ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Work on</p>
                    <ul className="space-y-0.5">
                      {s.weakestSkills.map((w) => (
                        <li key={w.tag} className="text-sm text-foreground flex justify-between gap-2">
                          <span>{humaniseTag(w.tag)}</span>
                          <span className="text-muted-foreground">{w.pct}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No weak spots with enough attempts yet.</p>
                )}
              </div>
              <Link to={t.path} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-3">
                Practise →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
