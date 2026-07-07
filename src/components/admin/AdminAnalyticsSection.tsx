import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AnalyticsSummary = {
  event_counts: Record<string, number>;
  by_day: Array<{ date: string; events: Record<string, number> }>;
  trainer_by_type: Record<string, number>;
  funnel: Record<string, Record<string, number>>;
  unique_sessions: number;
  unique_users: number;
  signups_by_day?: Array<{ date: string; signups: number }>;
};

/** Human-readable labels for analytics event names (so admins know what each event means). */
const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  trainer_opened: "Trainer page opened",
  trainer_started: "Drill started",
  trainer_completed: "Drill completed",
  trainer_abandoned: "Drill abandoned (left mid-session)",
  trainer_mode_selected: "Calculator mode selected",
  dashboard_viewed: "Dashboard viewed",
  dashboard_loaded: "Dashboard loaded",
  sign_in: "Sign in",
  sign_out: "Sign out",
  sign_up: "Sign up",
  auth_modal_opened: "Auth modal opened",
  shortcuts_opened: "Calculator shortcuts opened",
  bug_report_opened: "Bug report / feedback opened",
};

const CHART_EVENT_KEYS = ["page_view", "trainer_started", "trainer_completed", "trainer_abandoned"] as const;
const CHART_COLORS: Record<string, string> = {
  page_view: "#64748b",
  trainer_started: "#0ea5e9",
  trainer_completed: "#22c55e",
  trainer_abandoned: "#f59e0b",
};

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAnalyticsJson(analytics: AnalyticsSummary): void {
  downloadText(
    "analytics-export.json",
    JSON.stringify(analytics, null, 2),
    "application/json"
  );
}

function funnelTotals(funnel: AnalyticsSummary["funnel"] | undefined): { started: number; completed: number } {
  let started = 0;
  let completed = 0;
  for (const counts of Object.values(funnel ?? {})) {
    started += counts.trainer_started ?? 0;
    completed += counts.trainer_completed ?? 0;
  }
  return { started, completed };
}

function ratePct(numerator: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : "-";
}

function rateColorClass(numerator: number, denominator: number): string {
  if (denominator <= 0) return "text-muted-foreground";
  const r = numerator / denominator;
  if (r >= 0.6) return "text-emerald-600";
  if (r >= 0.3) return "text-amber-600";
  return "text-red-600";
}

function buildChartData(byDay: AnalyticsSummary["by_day"]): Array<Record<string, string | number>> {
  if (!byDay?.length) return [];
  return byDay.map(({ date, events }) => {
    const row: Record<string, string | number> = { date };
    CHART_EVENT_KEYS.forEach((k) => (row[k] = (events as Record<string, number>)[k] ?? 0));
    return row;
  });
}

type AdminAnalyticsSectionProps = {
  analytics: AnalyticsSummary;
};

export default function AdminAnalyticsSection({ analytics }: AdminAnalyticsSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-foreground">Analytics (events)</h2>
        <button
          type="button"
          onClick={() => exportAnalyticsJson(analytics)}
          className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
        >
          Export JSON
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Unique sessions</p>
          <p className="text-2xl font-bold text-foreground">{analytics.unique_sessions}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Unique users (logged in)</p>
          <p className="text-2xl font-bold text-foreground">{analytics.unique_users}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Sign-ups</p>
          <p className="text-2xl font-bold text-foreground">{analytics.event_counts?.sign_up ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {ratePct(analytics.event_counts?.sign_up ?? 0, analytics.unique_sessions)} of sessions
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">Drills completed</p>
          <p className="text-2xl font-bold text-foreground">{funnelTotals(analytics.funnel).completed}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {ratePct(funnelTotals(analytics.funnel).completed, funnelTotals(analytics.funnel).started)} of{" "}
            {funnelTotals(analytics.funnel).started} started
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Event counts</h3>
          <p className="px-4 py-1 text-xs text-muted-foreground border-b border-border">What each event means (in selected date range)</p>
          <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
            {Object.entries(analytics.event_counts ?? {}).length === 0 ? (
              <li className="px-4 py-3 text-muted-foreground text-sm">No events in range</li>
            ) : (
              Object.entries(analytics.event_counts ?? {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([name, count]) => (
                  <li key={name} className="px-4 py-2 flex justify-between items-baseline gap-2 text-sm">
                    <span className="text-foreground min-w-0">
                      <span className="font-medium">{EVENT_LABELS[name] ?? name.replace(/_/g, " ")}</span>
                      {EVENT_LABELS[name] && <span className="text-muted-foreground text-xs ml-1">({name})</span>}
                    </span>
                    <span className="font-medium text-foreground shrink-0">{String(count)}</span>
                  </li>
                ))
            )}
          </ul>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Trainer usage (by type)</h3>
          <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
            {Object.entries(analytics.trainer_by_type ?? {}).length === 0 ? (
              <li className="px-4 py-3 text-muted-foreground text-sm">No trainer events in range</li>
            ) : (
              Object.entries(analytics.trainer_by_type ?? {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <li key={type} className="px-4 py-2 flex justify-between text-sm">
                    <span className="text-foreground">{type.replace(/_/g, " ")}</span>
                    <span className="font-medium text-foreground">{String(count)}</span>
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>
      {analytics.by_day?.length > 0 && (
          <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Events over time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buildChartData(analytics.by_day)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(v) => String(v)}
                    formatter={(value: number | undefined) => [value ?? 0, ""]}
                  />
                  {CHART_EVENT_KEYS.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key.replace(/_/g, " ")}
                      stroke={CHART_COLORS[key] ?? "#64748b"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
      )}
      {analytics.signups_by_day && analytics.signups_by_day.length > 0 && (
        <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">New sign-ups over time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.signups_by_day} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(v) => String(v)} />
                <Bar dataKey="signups" name="Sign-ups" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {(!analytics.signups_by_day || analytics.signups_by_day.length === 0) && (
        <p className="mt-4 text-sm text-muted-foreground">No sign-ups in this date range for the chart.</p>
      )}
      {analytics.funnel && Object.keys(analytics.funnel).length > 0 && (
        <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Funnel (opened → started → completed / abandoned)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="px-4 py-2 text-left font-medium text-foreground">Trainer</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Opened</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Started</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Start rate</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Completed</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Completion</th>
                  <th className="px-4 py-2 text-right font-medium text-foreground">Abandoned</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.funnel)
                  .sort(([, a], [, b]) => (b.trainer_opened ?? 0) - (a.trainer_opened ?? 0))
                  .map(([type, counts]) => {
                    const opened = counts.trainer_opened ?? 0;
                    const started = counts.trainer_started ?? 0;
                    const completed = counts.trainer_completed ?? 0;
                    return (
                      <tr key={type} className="border-b border-border">
                        <td className="px-4 py-2 text-foreground">{type.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 text-right font-medium">{opened}</td>
                        <td className="px-4 py-2 text-right font-medium">{started}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${rateColorClass(started, opened)}`}>
                          {ratePct(started, opened)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{completed}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${rateColorClass(completed, started)}`}>
                          {ratePct(completed, started)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{counts.trainer_abandoned ?? 0}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 border-t border-border bg-secondary/50 text-xs text-muted-foreground">
            Sorted by most opened. Rates: green ≥60%, amber ≥30%, red &lt;30%. A low start rate means the
            page isn&apos;t convincing visitors to begin; a low completion rate means the drill loses them
            midway.
          </p>
        </div>
      )}
    </section>
  );
}
