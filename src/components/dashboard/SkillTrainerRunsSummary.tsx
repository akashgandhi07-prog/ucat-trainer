import { Link } from "react-router-dom";
import {
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_PATHS,
  type SkillTrainerSessionType,
} from "../../types/training";

/** A run summary row from `sessions` (cloud) or guest_sessions (guest, no timestamp). */
type RunRow = {
  training_type: string;
  correct: number;
  total: number;
  created_at?: string;
};

const PURPOSE: Record<SkillTrainerSessionType, string> = {
  qr_setup: "Information, operation, unit and calculator entry",
  qr_data_extraction: "Source cells, value and unit from tables",
  qr_estimation: "Answer range and the fastest reliable shortcut",
  dm_constraints: "Valid arrangements built against every rule",
};

function pct(row: RunRow) {
  return row.total > 0 ? Math.round((row.correct / row.total) * 100) : null;
}

/**
 * Per-trainer run history for the SkillTrainerShell trainers, read from the same
 * `sessions` rows as the established trainers. Scores are points out of points
 * available, so a run is comparable however many items were answered.
 */
export default function SkillTrainerRunsSummary({
  title,
  sessions,
  types,
}: {
  title: string;
  sessions: RunRow[];
  types: readonly SkillTrainerSessionType[];
}) {
  return (
    <section aria-label={title}>
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {types.map((type) => {
          const runs = sessions.filter((s) => s.training_type === type && s.total > 0);
          const scores = runs.map(pct).filter((n): n is number => n != null);
          const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
          const best = scores.length ? Math.max(...scores) : null;
          const last = runs[runs.length - 1];
          const lastDate = last?.created_at
            ? new Date(last.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : null;
          return (
            <div key={type} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{TRAINING_TYPE_LABELS[type]}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{PURPOSE[type]}</p>
                </div>
                <Link
                  to={TRAINING_TYPE_PATHS[type]}
                  className="shrink-0 text-sm font-medium text-primary hover:text-primary/80"
                >
                  {runs.length ? "Practise" : "Start"}
                </Link>
              </div>
              {runs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No runs yet.</p>
              ) : (
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Runs</dt>
                    <dd className="text-xl font-bold text-foreground">{runs.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Avg</dt>
                    <dd className="text-xl font-bold text-foreground">{avg != null ? `${avg}%` : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Best</dt>
                    <dd className="text-xl font-bold text-foreground">{best != null ? `${best}%` : "-"}</dd>
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground">
                    Last run: {last.correct}/{last.total} points
                    {lastDate ? ` · ${lastDate}` : ""}
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
