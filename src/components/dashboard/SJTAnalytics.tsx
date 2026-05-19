import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// UCAT SJT band thresholds (approximate, based on official UCAT score distributions)
const SJT_BANDS = [
  { pct: 80, label: "Band 1", color: "#16a34a" },
  { pct: 60, label: "Band 2", color: "#2563eb" },
  { pct: 40, label: "Band 3", color: "#d97706" },
] as const;

function getSjtBand(pct: number | null): { band: string; color: string; description: string } | null {
  if (pct === null) return null;
  if (pct >= 80) return { band: "Band 1", color: "#16a34a", description: "Very high: top performers" };
  if (pct >= 60) return { band: "Band 2", color: "#2563eb", description: "Good: above average" };
  if (pct >= 40) return { band: "Band 3", color: "#d97706", description: "Moderate: room to improve" };
  return { band: "Band 4", color: "#dc2626", description: "Needs work: focus here" };
}
import type { SJTSessionsRow, SJTQuestionType, GMCDomainId } from "../../types/sjt";

const GMC_DOMAIN_LABELS: Record<GMCDomainId, string> = {
  knowledge_skills_development: "Knowledge & Skills",
  patients_partnership_communication: "Patients & Communication",
  colleagues_culture_safety: "Colleagues & Safety",
  trust_professionalism: "Trust & Professionalism",
};

type Props = { sessions: SJTSessionsRow[] };

export default function SJTAnalytics({ sessions }: Props) {
  const completed = useMemo(
    () => sessions.filter((s) => s.completed && s.max_score > 0),
    [sessions],
  );

  const avgPct = useMemo(() => {
    if (!completed.length) return null;
    return Math.round(
      completed.reduce((sum, s) => sum + (s.score / s.max_score) * 100, 0) / completed.length,
    );
  }, [completed]);

  const bestPct = useMemo(() => {
    if (!completed.length) return null;
    return Math.max(...completed.map((s) => Math.round((s.score / s.max_score) * 100)));
  }, [completed]);

  const chartData = useMemo(
    () =>
      completed.slice(-20).map((s) => ({
        pct: Math.round((s.score / s.max_score) * 100),
        displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })),
    [completed],
  );

  const byType = useMemo(() => {
    const m: Partial<Record<SJTQuestionType, { count: number; total: number }>> = {};
    for (const s of completed) {
      const entry = m[s.question_type] ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += (s.score / s.max_score) * 100;
      m[s.question_type] = entry;
    }
    return m;
  }, [completed]);

  const byDomain = useMemo(() => {
    const m: Partial<Record<GMCDomainId, { count: number; total: number }>> = {};
    for (const s of completed) {
      const entry = m[s.domain] ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += (s.score / s.max_score) * 100;
      m[s.domain] = entry;
    }
    return m;
  }, [completed]);

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-muted-foreground mb-4">
          No SJT sessions yet. Practice situational judgement to track your score across GMC
          domains.
        </p>
        <Link
          to="/ucat-sjt-practice"
          className="inline-flex px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go to SJT Trainer
        </Link>
      </div>
    );
  }

  const avgBand = getSjtBand(avgPct);

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Sessions</p>
          <p className="text-3xl font-bold text-foreground">{sessions.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Avg score</p>
          <p className="text-3xl font-bold text-foreground">
            {avgPct != null ? `${avgPct}%` : "-"}
          </p>
          {avgBand && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: avgBand.color }}
              />
              <span className="text-xs font-semibold" style={{ color: avgBand.color }}>
                {avgBand.band}
              </span>
              <span className="text-[10px] text-muted-foreground">· {avgBand.description}</span>
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-5 col-span-2 sm:col-span-1">
          <p className="text-sm font-medium text-muted-foreground">Best score</p>
          <p className="text-3xl font-bold text-foreground">
            {bestPct != null ? `${bestPct}%` : "-"}
          </p>
          {bestPct != null && (() => {
            const b = getSjtBand(bestPct);
            return b ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-xs font-semibold" style={{ color: b.color }}>{b.band}</span>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Band legend */}
      <div className="bg-secondary rounded-xl border border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">UCAT SJT bands (approximate)</p>
        <div className="flex flex-wrap gap-3">
          {SJT_BANDS.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-xs text-foreground font-medium">{b.label}</span>
              <span className="text-[10px] text-muted-foreground">≥{b.pct}%</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-foreground font-medium">Band 4</span>
            <span className="text-[10px] text-muted-foreground">&lt;40%</span>
          </div>
        </div>
      </div>

      {/* Score over time */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-base font-medium text-foreground mb-4">Score over time</h3>
          <div className="h-56 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="#94a3b8"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(_, p) => p?.[0]?.payload?.displayDate ?? ""}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Score"]}
                />
                {SJT_BANDS.map((b) => (
                  <ReferenceLine
                    key={b.label}
                    y={b.pct}
                    stroke={b.color}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{ value: b.label, position: "insideTopRight", fontSize: 9, fill: b.color }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By question type */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">By question type</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["appropriateness", "importance", "ranking"] as SJTQuestionType[]).map((type) => {
            const s = byType[type];
            return (
              <div key={type} className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </p>
                <p className="text-xl font-bold text-foreground">
                  {s && s.count > 0 ? `${Math.round(s.total / s.count)}%` : "-"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s?.count ?? 0} session{(s?.count ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* By GMC domain */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">By GMC domain</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(GMC_DOMAIN_LABELS) as [GMCDomainId, string][]).map(
            ([domain, label]) => {
              const s = byDomain[domain];
              return (
                <div key={domain} className="bg-secondary rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold text-foreground">
                    {s && s.count > 0 ? `${Math.round(s.total / s.count)}%` : "-"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s?.count ?? 0} session{(s?.count ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
