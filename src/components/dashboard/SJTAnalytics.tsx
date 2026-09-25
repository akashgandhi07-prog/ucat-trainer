import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SJTSessionsRow, SJTQuestionType, GMCDomainId } from "../../types/sjt";
import { compareAccuracyWindows } from "../../lib/progressComparisons";

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
    const score = completed.reduce((sum, s) => sum + s.score, 0);
    const maximum = completed.reduce((sum, s) => sum + s.max_score, 0);
    return Math.round((score / maximum) * 100);
  }, [completed]);

  const recentComparison = useMemo(
    () => compareAccuracyWindows(completed.map((s) => ({ correct: s.score, total: s.max_score }))),
    [completed],
  );

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
    const m: Partial<Record<SJTQuestionType, { count: number; score: number; maximum: number }>> = {};
    for (const s of completed) {
      const entry = m[s.question_type] ?? { count: 0, score: 0, maximum: 0 };
      entry.count++;
      entry.score += s.score;
      entry.maximum += s.max_score;
      m[s.question_type] = entry;
    }
    return m;
  }, [completed]);

  const byDomain = useMemo(() => {
    const m: Partial<Record<GMCDomainId, { count: number; score: number; maximum: number }>> = {};
    for (const s of completed) {
      const entry = m[s.domain] ?? { count: 0, score: 0, maximum: 0 };
      entry.count++;
      entry.score += s.score;
      entry.maximum += s.max_score;
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
          <p className="mt-1 text-xs text-muted-foreground">Measured across answered items</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 col-span-2 sm:col-span-1">
          <p className="text-sm font-medium text-muted-foreground">Best score</p>
          <p className="text-3xl font-bold text-foreground">
            {bestPct != null ? `${bestPct}%` : "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Your strongest completed session</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-foreground">Last five sessions vs previous five</h3>
        {recentComparison ? <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{recentComparison.recent}%</span>
          <span className="text-sm text-muted-foreground">previous {recentComparison.previous}%</span>
          <span className={`text-sm font-semibold ${recentComparison.delta >= 0 ? "text-emerald-700" : "text-red-600"}`}>{recentComparison.delta > 0 ? "+" : ""}{recentComparison.delta} points</span>
        </div> : <p className="mt-2 text-sm text-muted-foreground">Complete 10 SJT sessions to compare two equal groups of five.</p>}
      </div>

      {/* Score over time */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-base font-medium text-foreground mb-4">Score over time</h3>
          <p className="sr-only">
            Text summary: {chartData.length} recent sessions, from {chartData[0].pct}% on {chartData[0].displayDate} to {chartData.at(-1)!.pct}% on {chartData.at(-1)!.displayDate}. Your measured average is {avgPct}%.
          </p>
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
                  {s && s.maximum > 0 ? `${Math.round((s.score / s.maximum) * 100)}%` : "-"}
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
                    {s && s.maximum > 0 ? `${Math.round((s.score / s.maximum) * 100)}%` : "-"}
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
