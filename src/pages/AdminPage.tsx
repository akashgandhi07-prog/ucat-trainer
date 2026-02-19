import { useEffect, useState } from "react";
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
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import { supabase } from "../lib/supabase";
import { dashboardLog } from "../lib/logger";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type AdminStats = {
  total_users: number;
  total_sessions: number;
  sessions_speed_reading: number;
  sessions_rapid_recall: number;
  sessions_keyword_scanning: number;
  sessions_calculator: number;
  sessions_inference_trainer: number;
  syllogism_sessions_count: number;
  bug_reports_count: number;
  suggestions_count: number;
};

type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: "bug" | "suggestion";
  description: string;
  page_url: string | null;
  created_at: string;
};

type FeedbackFilter = "all" | "bug" | "suggestion";

export type AdminDateRange = "all" | "7" | "30" | "90";

type AnalyticsSummary = {
  event_counts: Record<string, number>;
  by_day: Array<{ date: string; events: Record<string, number> }>;
  trainer_by_type: Record<string, number>;
  funnel: Record<string, Record<string, number>>;
  unique_sessions: number;
  unique_users: number;
};

function getDateRangeParams(range: AdminDateRange): { since_ts: string | null; until_ts: string | null } {
  if (range === "all") return { since_ts: null, until_ts: null };
  const days = parseInt(range, 10);
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - days);
  return { since_ts: since.toISOString(), until_ts: until.toISOString() };
}

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFeedbackCsv(feedback: FeedbackRow[]): void {
  const headers = ["id", "type", "description", "page_url", "created_at"];
  const escape = (v: string | null) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = feedback.map((r) =>
    [r.id, r.type, escape(r.description), escape(r.page_url), r.created_at].join(",")
  );
  downloadText("feedback-export.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

function exportFeedbackJson(feedback: FeedbackRow[]): void {
  downloadText(
    "feedback-export.json",
    JSON.stringify(feedback, null, 2),
    "application/json"
  );
}

function exportAnalyticsJson(analytics: AnalyticsSummary): void {
  downloadText(
    "analytics-export.json",
    JSON.stringify(analytics, null, 2),
    "application/json"
  );
}

const CHART_EVENT_KEYS = ["page_view", "trainer_started", "trainer_completed", "trainer_abandoned"] as const;
const CHART_COLORS: Record<string, string> = {
  page_view: "#64748b",
  trainer_started: "#0ea5e9",
  trainer_completed: "#22c55e",
  trainer_abandoned: "#f59e0b",
};

function buildChartData(byDay: AnalyticsSummary["by_day"]): Array<Record<string, string | number>> {
  if (!byDay?.length) return [];
  return byDay.map(({ date, events }) => {
    const row: Record<string, string | number> = { date };
    CHART_EVENT_KEYS.forEach((k) => (row[k] = (events as Record<string, number>)[k] ?? 0));
    return row;
  });
}

export default function AdminPage() {
  const {
    user,
    profile,
    loading: authLoading,
    isAdmin,
    sessionLoadFailed,
  } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [dateRange, setDateRange] = useState<AdminDateRange>("30");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- stop loading when auth resolved */
      setLoading(false);
      return;
    }

    let mounted = true;
    const { since_ts, until_ts } = getDateRangeParams(dateRange);
    const rpcParams = { since_ts, until_ts };

    (async () => {
      const [statsRes, analyticsRes] = await Promise.all([
        supabase.rpc("get_admin_stats", rpcParams),
        supabase.rpc("get_analytics_summary", rpcParams),
      ]);
      if (!mounted) return;
      if (statsRes.error) {
        dashboardLog.error("Admin stats failed", { message: statsRes.error.message, code: statsRes.error.code });
        setError("Failed to load stats.");
        setLoading(false);
        return;
      }
      setStats(statsRes.data as AdminStats);
      if (analyticsRes.error) {
        dashboardLog.warn("Admin analytics failed", { message: analyticsRes.error.message });
        setAnalytics(null);
      } else {
        setAnalytics(analyticsRes.data as AnalyticsSummary);
      }

      const { data: feedbackData, error: feedbackErr } = await supabase
        .from("bug_reports")
        .select("id, user_id, type, description, page_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mounted) return;
      if (feedbackErr) {
        dashboardLog.warn("Admin feedback fetch failed", { message: feedbackErr.message });
      } else {
        setFeedback((feedbackData as FeedbackRow[]) ?? []);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user, isAdmin, dateRange]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  if (authLoading || (user && profile === null && loading)) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-slate-600">Loading admin area…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            {sessionLoadFailed ? (
              <>
                <p className="text-red-700 font-medium mb-2">
                  We couldn&apos;t verify your admin access right now.
                </p>
                <p className="text-slate-700 text-sm mb-4">
                  Check your connection, then try again.
                </p>
                <Link
                  to="/"
                  className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-blue-600 font-medium hover:underline"
                >
                  Back to Home
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-900 font-medium mb-2">
                  Sign in as an admin to view this page.
                </p>
                <p className="text-slate-700 text-sm mb-4">
                  You&apos;ll need an admin account to access platform stats and feedback.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <p className="text-slate-900 font-medium mb-2">
              You don&apos;t have access to the admin dashboard.
            </p>
            <p className="text-slate-700 text-sm mb-4">
              If you think this is a mistake, contact the site owner.
            </p>
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-blue-600 font-medium hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-slate-600">Loading admin dashboard…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex flex-col items-center justify-center p-4"
          tabIndex={-1}
        >
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 py-8" tabIndex={-1}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-blue-600 font-medium hover:underline">
            Back to Home
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-slate-600">Date range:</span>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(["all", "7", "30", "90"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  dateRange === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r === "all" ? "All time" : `Last ${r} days`}
              </button>
            ))}
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total users</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_users ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total sessions</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_sessions ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Bug reports</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.bug_reports_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Suggestions</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.suggestions_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Speed reading sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_speed_reading ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Rapid recall sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_rapid_recall ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Keyword scanning sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_keyword_scanning ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Calculator sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_calculator ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Inference trainer sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_inference_trainer ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Syllogism sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.syllogism_sessions_count ?? 0}</p>
            </div>
          </div>
        </section>

        {analytics && (
          <section className="mb-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Analytics (events)</h2>
              <button
                type="button"
                onClick={() => exportAnalyticsJson(analytics)}
                className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Export JSON
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Unique sessions</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.unique_sessions}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Unique users (logged in)</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.unique_users}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-200">Event counts</h3>
                <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {Object.entries(analytics.event_counts ?? {}).length === 0 ? (
                    <li className="px-4 py-3 text-slate-500 text-sm">No events in range</li>
                  ) : (
                    Object.entries(analytics.event_counts ?? {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([name, count]) => (
                        <li key={name} className="px-4 py-2 flex justify-between text-sm">
                          <span className="text-slate-700">{name}</span>
                          <span className="font-medium text-slate-900">{String(count)}</span>
                        </li>
                      ))
                  )}
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-200">Trainer usage (by type)</h3>
                <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {Object.entries(analytics.trainer_by_type ?? {}).length === 0 ? (
                    <li className="px-4 py-3 text-slate-500 text-sm">No trainer events in range</li>
                  ) : (
                    Object.entries(analytics.trainer_by_type ?? {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([type, count]) => (
                        <li key={type} className="px-4 py-2 flex justify-between text-sm">
                          <span className="text-slate-700">{type.replace(/_/g, " ")}</span>
                          <span className="font-medium text-slate-900">{String(count)}</span>
                        </li>
                      ))
                  )}
                </ul>
              </div>
            </div>
            {analytics.by_day?.length > 0 && (
                <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Events over time</h3>
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
            {analytics.funnel && Object.keys(analytics.funnel).length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-200">Funnel (opened → started → completed / abandoned)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Trainer</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Opened</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Started</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Completed</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-700">Abandoned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.funnel)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([type, counts]) => (
                          <tr key={type} className="border-b border-slate-100">
                            <td className="px-4 py-2 text-slate-700">{type.replace(/_/g, " ")}</td>
                            <td className="px-4 py-2 text-right font-medium">{counts.trainer_opened ?? 0}</td>
                            <td className="px-4 py-2 text-right font-medium">{counts.trainer_started ?? 0}</td>
                            <td className="px-4 py-2 text-right font-medium">{counts.trainer_completed ?? 0}</td>
                            <td className="px-4 py-2 text-right font-medium">{counts.trainer_abandoned ?? 0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent feedback</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportFeedbackCsv(feedback)}
                className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => exportFeedbackJson(feedback)}
                className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Export JSON
              </button>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(["all", "bug", "suggestion"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeedbackFilter(f)}
                  className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                    feedbackFilter === f
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f === "all" ? "All" : f === "bug" ? "Bugs" : "Suggestions"}
                </button>
              ))}
              </div>
            </div>
          </div>
          {feedback.length === 0 ? (
            <p className="text-slate-500">No feedback yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <ul className="divide-y divide-slate-200">
                {feedback
                  .filter((r) => feedbackFilter === "all" || r.type === feedbackFilter)
                  .map((r) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            r.type === "bug"
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {r.type === "bug" ? "Bug" : "Suggestion"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">{r.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r.page_url && <span>{r.page_url} · </span>}
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
