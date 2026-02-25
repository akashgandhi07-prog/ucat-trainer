import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  sessions_mental_maths?: number;
  syllogism_sessions_count: number;
  bug_reports_count: number;
  suggestions_count: number;
};

export type UsageSummaryPayload = {
  total_sessions: number;
  total_questions: number;
  total_time_seconds?: number;
  active_users: number;
  guest_sessions: number;
  new_users: number;
};

export type TrainerUsagePayload = Record<string, number>;

export type AdminUserRow = {
  user_id: string;
  email: string;
  display_name?: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct?: number;
  session_questions?: number;
  total_time_seconds?: number;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

type RegistrationRow = {
  user_id: string;
  email: string;
  display_name?: string;
  created_at: string | null;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct?: number;
  session_questions?: number;
  total_time_seconds?: number;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

type UsageSummaryResponse = {
  summary: UsageSummaryPayload;
  trainer_usage: TrainerUsagePayload;
  trainer_questions?: Record<string, number>;
  trainer_time_seconds?: Record<string, number>;
  guest_activity: Record<string, number>;
  users: AdminUserRow[];
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

type NewUserRow = {
  user_id: string;
  full_name: string | null;
  created_at: string;
  email: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct: number;
  event_counts: Record<string, number>;
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

import type {
  QuestionFeedbackIssueType,
} from "../lib/questionFeedback";

type QuestionFeedbackRow = {
  id: string;
  user_id: string | null;
  trainer_type: string;
  question_kind: string;
  question_identifier: string;
  issue_type: QuestionFeedbackIssueType;
  comment: string | null;
  passage_id: string | null;
  session_id: string | null;
  page_url: string | null;
  created_at: string;
};

export type AdminDateRange = "all" | "7" | "30" | "90";

type AnalyticsSummary = {
  event_counts: Record<string, number>;
  by_day: Array<{ date: string; events: Record<string, number> }>;
  trainer_by_type: Record<string, number>;
  funnel: Record<string, Record<string, number>>;
  unique_sessions: number;
  unique_users: number;
  signups_by_day?: Array<{ date: string; signups: number }>;
};

function getDateRangeParams(range: AdminDateRange): { since_ts: string | null; until_ts: string | null } {
  if (range === "all") return { since_ts: null, until_ts: null };
  const days = parseInt(range, 10);
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - days);
  return { since_ts: since.toISOString(), until_ts: until.toISOString() };
}

function formatTimeSeconds(seconds: number | undefined | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
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

function exportQuestionFeedbackCsv(rows: QuestionFeedbackRow[]): void {
  const headers = [
    "id",
    "trainer_type",
    "question_kind",
    "question_identifier",
    "issue_type",
    "comment",
    "passage_id",
    "page_url",
    "created_at",
  ];
  const escape = (v: string | null) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rowsOut = rows.map((r) =>
    [
      r.id,
      r.trainer_type,
      r.question_kind,
      r.question_identifier,
      r.issue_type,
      escape(r.comment),
      escape(r.passage_id),
      escape(r.page_url),
      r.created_at,
    ].join(",")
  );
  downloadText(
    "question-feedback-export.csv",
    [headers.join(","), ...rowsOut].join("\n"),
    "text/csv;charset=utf-8"
  );
}

function exportQuestionFeedbackJson(rows: QuestionFeedbackRow[]): void {
  downloadText(
    "question-feedback-export.json",
    JSON.stringify(rows, null, 2),
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

function filterAndSortUsers(
  users: AdminUserRow[],
  sortKey: keyof AdminUserRow | "accuracy",
  sortDir: "asc" | "desc",
  minQuestions: number,
  emailQuery: string
): AdminUserRow[] {
  let out = users.filter(
    (u) =>
      u.total_questions >= minQuestions &&
      (emailQuery === "" || (u.email && u.email.toLowerCase().includes(emailQuery.toLowerCase())))
  );
  out = [...out].sort((a, b) => {
    let aVal: string | number | null | undefined;
    let bVal: string | number | null | undefined;
    if (sortKey === "accuracy") {
      const aDen = a.session_questions ?? 0;
      const bDen = b.session_questions ?? 0;
      aVal = aDen > 0 ? ((a.session_correct ?? 0) / aDen) * 100 : null;
      bVal = bDen > 0 ? ((b.session_correct ?? 0) / bDen) * 100 : null;
    } else {
      aVal = a[sortKey];
      bVal = b[sortKey];
    }
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDir === "asc" ? -1 : 1;
    if (bVal == null) return sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      const c = aVal.localeCompare(bVal);
      return sortDir === "asc" ? c : -c;
    }
    const n = (aVal as number) - (bVal as number);
    return sortDir === "asc" ? n : -n;
  });
  return out;
}

function filterAndSortRegistrations(
  rows: RegistrationRow[],
  sortKey: keyof RegistrationRow,
  sortDir: "asc" | "desc",
  query: string
): RegistrationRow[] {
  const trimmedQuery = query.trim().toLowerCase();
  let out = rows;
  if (trimmedQuery) {
    out = rows.filter((r) => {
      const name = (r.display_name ?? "").toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      return name.includes(trimmedQuery) || email.includes(trimmedQuery);
    });
  }
  out = [...out].sort((a, b) => {
    let aVal = a[sortKey] as string | number | null | undefined;
    let bVal = b[sortKey] as string | number | null | undefined;
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDir === "asc" ? -1 : 1;
    if (bVal == null) return sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      const c = aVal.localeCompare(bVal);
      return sortDir === "asc" ? c : -c;
    }
    const n = (aVal as number) - (bVal as number);
    return sortDir === "asc" ? n : -n;
  });
  return out;
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
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [questionFeedback, setQuestionFeedback] = useState<QuestionFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type UserSortKey = keyof AdminUserRow | "accuracy";
  const [userSortKey, setUserSortKey] = useState<UserSortKey>("total_questions");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  const [userFilterMinQuestions, setUserFilterMinQuestions] = useState<number>(0);
  const [userFilterEmail, setUserFilterEmail] = useState<string>("");
  const [newUsers, setNewUsers] = useState<NewUserRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  type RegistrationSortKey = keyof RegistrationRow;
  const [registrationSortKey, setRegistrationSortKey] = useState<RegistrationSortKey>("created_at");
  const [registrationSortDir, setRegistrationSortDir] = useState<"asc" | "desc">("desc");
  const [registrationFilterQuery, setRegistrationFilterQuery] = useState<string>("");

  const USER_TABLE_COLUMNS: { key: UserSortKey; label: string }[] = [
    { key: "display_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "last_active_at", label: "Last access" },
    { key: "total_questions", label: "Questions" },
    { key: "accuracy", label: "Accuracy %" },
    { key: "total_time_seconds", label: "Time spent" },
    { key: "days_active", label: "Days active" },
    { key: "last_wpm", label: "WPM (last)" },
    { key: "speed_reading", label: "Speed reading" },
    { key: "rapid_recall", label: "Rapid recall" },
    { key: "keyword_scanning", label: "Keyword scanning" },
    { key: "calculator", label: "Calculator" },
    { key: "inference_trainer", label: "Inference" },
    { key: "mental_maths", label: "Mental maths" },
    { key: "syllogism_micro", label: "Syllogism micro" },
    { key: "syllogism_macro", label: "Syllogism macro" },
  ];

  const REGISTRATION_TABLE_COLUMNS: { key: RegistrationSortKey; label: string }[] = [
    { key: "display_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "created_at", label: "Registered on" },
    { key: "last_active_at", label: "Last active" },
    { key: "days_active", label: "Days active" },
    { key: "total_questions", label: "Questions" },
    { key: "total_time_seconds", label: "Time spent" },
    { key: "speed_reading", label: "Speed reading" },
    { key: "rapid_recall", label: "Rapid recall" },
    { key: "keyword_scanning", label: "Keyword scanning" },
    { key: "calculator", label: "Calculator" },
    { key: "inference_trainer", label: "Inference" },
    { key: "mental_maths", label: "Mental maths" },
    { key: "syllogism_micro", label: "Syllogism micro" },
    { key: "syllogism_macro", label: "Syllogism macro" },
  ];

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
      const [statsRes, analyticsRes, usageRes, newUsersRes, registrationsRes] = await Promise.all([
        supabase.rpc("get_admin_stats", rpcParams),
        supabase.rpc("get_analytics_summary", rpcParams),
        supabase.rpc("get_admin_usage_summary", rpcParams),
        supabase.rpc("get_admin_new_users", { ...rpcParams, limit_rows: 300 }),
        supabase.rpc("get_admin_registrations_overview", { limit_rows: 5000 }),
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
      if (usageRes.error) {
        dashboardLog.warn("Admin usage summary failed", { message: usageRes.error.message });
        setUsageSummary(null);
      } else {
        setUsageSummary(usageRes.data as UsageSummaryResponse);
      }
      if (newUsersRes.error) {
        dashboardLog.warn("Admin new users failed", { message: newUsersRes.error.message });
        setNewUsers([]);
      } else {
        setNewUsers((newUsersRes.data as NewUserRow[]) ?? []);
      }

      if (registrationsRes.error) {
        dashboardLog.warn("Admin registrations failed", { message: registrationsRes.error.message });
        setRegistrations([]);
      } else {
        setRegistrations((registrationsRes.data as RegistrationRow[]) ?? []);
      }

      const { data: feedbackData, error: feedbackErr } = await supabase
        .from("bug_reports")
        .select("id, user_id, type, description, page_url, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (feedbackErr) {
        dashboardLog.warn("Admin feedback fetch failed", { message: feedbackErr.message });
      } else {
        setFeedback((feedbackData as FeedbackRow[]) ?? []);
      }

      const { data: qfData, error: qfErr } = await supabase
        .from("question_feedback")
        .select(
          "id, user_id, trainer_type, question_kind, question_identifier, issue_type, comment, passage_id, session_id, page_url, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (!mounted) return;
      if (qfErr) {
        dashboardLog.warn("Admin question feedback fetch failed", {
          message: qfErr.message,
          code: qfErr.code,
        });
      } else {
        setQuestionFeedback((qfData as QuestionFeedbackRow[]) ?? []);
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
      <main id="main-content" className="flex-1 max-w-6xl mx-auto px-4 py-8" tabIndex={-1}>
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

        {stats && usageSummary && (
          <section className="mb-8" aria-label="Key metrics">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">Key metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">New sign-ups (in range)</p>
                <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.new_users}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Active users (in range)</p>
                <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.active_users}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total questions (in range)</p>
                <p className="text-2xl font-bold text-slate-900">{Number(usageSummary.summary.total_questions).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total time (in range)</p>
                <p className="text-2xl font-bold text-slate-900">{formatTimeSeconds(usageSummary.summary.total_time_seconds)}</p>
              </div>
            </div>
          </section>
        )}

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
              <p className="text-sm font-medium text-slate-500">Mental maths sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_mental_maths ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Syllogism sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.syllogism_sessions_count ?? 0}</p>
            </div>
          </div>
        </section>

        {usageSummary && (
          <>
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total sessions</p>
                  <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.total_sessions}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total questions</p>
                  <p className="text-2xl font-bold text-slate-900">{Number(usageSummary.summary.total_questions).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total time spent</p>
                  <p className="text-2xl font-bold text-slate-900">{formatTimeSeconds(usageSummary.summary.total_time_seconds)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Active users (in range)</p>
                  <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.active_users}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Guest sessions</p>
                  <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.guest_sessions}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">New sign-ups (in range)</p>
                  <p className="text-2xl font-bold text-slate-900">{usageSummary.summary.new_users}</p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">New users by date</h2>
                <button
                  type="button"
                  onClick={() => {
                    const headers = ["Date", "Full name", "Email", "Activity"];
                    const escape = (v: string | null) => {
                      if (v == null) return "";
                      const s = String(v);
                      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
                      return s;
                    };
                    const rows = newUsers.map((row) => {
                      const eventParts = Object.entries(row.event_counts ?? {})
                        .filter(([, n]) => n > 0)
                        .map(([name, n]) => `${EVENT_LABELS[name] ?? name.replace(/_/g, " ")}: ${n}`);
                      const sessions: string[] = [];
                      if (row.speed_reading) sessions.push(`${row.speed_reading} speed reading`);
                      if (row.rapid_recall) sessions.push(`${row.rapid_recall} rapid recall`);
                      if (row.keyword_scanning) sessions.push(`${row.keyword_scanning} keyword scanning`);
                      if (row.calculator) sessions.push(`${row.calculator} calculator`);
                      if (row.inference_trainer) sessions.push(`${row.inference_trainer} inference`);
                      if (row.mental_maths) sessions.push(`${row.mental_maths} mental maths`);
                      if (row.syllogism_micro) sessions.push(`${row.syllogism_micro} syllogism micro`);
                      if (row.syllogism_macro) sessions.push(`${row.syllogism_macro} syllogism macro`);
                      const activityParts = [
                        eventParts.length ? eventParts.join("; ") : "",
                        sessions.length ? `Sessions: ${sessions.join("; ")}` : null,
                        row.total_questions > 0 ? `${row.total_questions} questions answered` : null,
                      ].filter(Boolean);
                      const activityText = activityParts.join(" · ") || "—";
                      const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
                      return [dateStr, row.full_name || "—", row.email || "—", activityText].map(escape).join(",");
                    });
                    downloadText("new-users-by-date.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
                  }}
                  className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export CSV
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Sign-ups in the selected date range, with full name and what they&apos;ve looked at and done (page views, drills, sessions).
              </p>
              {newUsers.length > 0 && (
                <p className="text-sm text-slate-700 mb-4">
                  {(() => {
                    const activated = newUsers.filter((u) => u.total_questions > 0).length;
                    const total = newUsers.length;
                    const pct = total ? ((activated / total) * 100).toFixed(1) : "0";
                    return `${pct}% of new sign-ups in this range completed at least one drill (${activated} of ${total}).`;
                  })()}
                </p>
              )}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2 text-left font-medium text-slate-700">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-700">Full name</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-700">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newUsers.map((row) => {
                      const eventParts = Object.entries(row.event_counts ?? {})
                        .filter(([, n]) => n > 0)
                        .map(([name, n]) => `${EVENT_LABELS[name] ?? name.replace(/_/g, " ")}: ${n}`);
                      const sessions: string[] = [];
                      if (row.speed_reading) sessions.push(`${row.speed_reading} speed reading`);
                      if (row.rapid_recall) sessions.push(`${row.rapid_recall} rapid recall`);
                      if (row.keyword_scanning) sessions.push(`${row.keyword_scanning} keyword scanning`);
                      if (row.calculator) sessions.push(`${row.calculator} calculator`);
                      if (row.inference_trainer) sessions.push(`${row.inference_trainer} inference`);
                      if (row.mental_maths) sessions.push(`${row.mental_maths} mental maths`);
                      if (row.syllogism_micro) sessions.push(`${row.syllogism_micro} syllogism micro`);
                      if (row.syllogism_macro) sessions.push(`${row.syllogism_macro} syllogism macro`);
                      const activityParts = [
                        eventParts.length ? eventParts.join("; ") : null,
                        sessions.length ? `Sessions: ${sessions.join("; ")}` : null,
                        row.total_questions > 0 ? `${row.total_questions} questions answered` : null,
                      ].filter(Boolean);
                      const activityText = activityParts.length ? activityParts.join(" · ") : "—";
                      return (
                        <tr key={row.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                            {row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-900 font-medium">
                            {row.full_name || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-700 truncate max-w-[200px]" title={row.email || ""}>
                            {row.email || "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600 text-xs max-w-[400px]">
                            {activityText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {newUsers.length === 0 && (
                  <p className="px-4 py-6 text-slate-500 text-center">No new users in this date range.</p>
                )}
              </div>
            </section>

            {registrations.length > 0 && (
              <section className="mb-10">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">All registrations (students)</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      All registered users across all time, with per-trainer usage. Guest usage is shown separately below as
                      {" "}“Guest activity (anon)”.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      placeholder="Filter by name or email"
                      value={registrationFilterQuery}
                      onChange={(e) => setRegistrationFilterQuery(e.target.value)}
                      className="min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const headers = REGISTRATION_TABLE_COLUMNS.map((c) => c.label.toLowerCase().replace(/\s+/g, "_"));
                        const rows = filterAndSortRegistrations(
                          registrations,
                          registrationSortKey,
                          registrationSortDir,
                          registrationFilterQuery
                        ).map((r) => {
                          const escape = (v: string | number | null) => {
                            if (v == null) return "";
                            const s = String(v);
                            if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, "\"\"")}"`;
                            return s;
                          };
                          const formatDate = (value: string | null, withTime: boolean) => {
                            if (!value) return "";
                            const d = new Date(value);
                            return withTime
                              ? d.toLocaleString()
                              : d.toLocaleDateString(undefined, { dateStyle: "medium" });
                          };
                          const row: Record<string, string | number | null> = {
                            name: r.display_name || "",
                            email: r.email || "",
                            registered_on: formatDate(r.created_at, false),
                            last_active: formatDate(r.last_active_at, true),
                            days_active: r.days_active ?? null,
                            total_questions: r.total_questions,
                            total_time_seconds: r.total_time_seconds ?? null,
                            speed_reading: r.speed_reading,
                            rapid_recall: r.rapid_recall,
                            keyword_scanning: r.keyword_scanning,
                            calculator: r.calculator,
                            inference_trainer: r.inference_trainer,
                            mental_maths: r.mental_maths,
                            syllogism_micro: r.syllogism_micro,
                            syllogism_macro: r.syllogism_macro,
                          };
                          return headers.map((h) => escape(row[h])).join(",");
                        });
                        downloadText(
                          "admin-registrations-export.csv",
                          [headers.join(","), ...rows].join("\n"),
                          "text/csv;charset=utf-8"
                        );
                      }}
                      className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        {REGISTRATION_TABLE_COLUMNS.map(({ key, label }) => (
                          <th
                            key={key}
                            className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-100"
                            onClick={() => {
                              if (registrationSortKey === key) {
                                setRegistrationSortDir((d) => (d === "asc" ? "desc" : "asc"));
                              } else {
                                setRegistrationSortKey(key);
                              }
                            }}
                          >
                            {label}
                            {registrationSortKey === key ? (registrationSortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterAndSortRegistrations(
                        registrations,
                        registrationSortKey,
                        registrationSortDir,
                        registrationFilterQuery
                      ).map((r) => (
                        <tr key={r.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                          {REGISTRATION_TABLE_COLUMNS.map(({ key }) => {
                            if (key === "display_name") {
                              return (
                                <td key={key} className="px-2 py-2 text-slate-900 font-medium">
                                  {r.display_name || "—"}
                                </td>
                              );
                            }
                            if (key === "email") {
                              return (
                                <td key={key} className="px-2 py-2 text-slate-700">
                                  {r.email || "—"}
                                </td>
                              );
                            }
                            if (key === "created_at") {
                              return (
                                <td key={key} className="px-2 py-2 text-slate-600 text-xs whitespace-nowrap">
                                  {r.created_at
                                    ? new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                                    : "—"}
                                </td>
                              );
                            }
                            if (key === "last_active_at") {
                              return (
                                <td key={key} className="px-2 py-2 text-slate-600 text-xs whitespace-nowrap">
                                  {r.last_active_at ? new Date(r.last_active_at).toLocaleString() : "—"}
                                </td>
                              );
                            }
                            if (key === "total_time_seconds") {
                              return (
                                <td key={key} className="px-2 py-2 text-right text-slate-700">
                                  {formatTimeSeconds(r.total_time_seconds)}
                                </td>
                              );
                            }
                            if (key === "days_active") {
                              return (
                                <td key={key} className="px-2 py-2 text-right">
                                  {r.days_active ?? "—"}
                                </td>
                              );
                            }
                            const val = r[key];
                            const num = typeof val === "number" ? val : null;
                            return (
                              <td key={key} className="px-2 py-2 text-right">
                                {num != null ? num : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Trainer usage (sessions, questions, time in range)</h2>
              {Object.keys(usageSummary.trainer_usage).length > 0 && (
                <p className="text-sm text-slate-700 mb-3">
                  Most used this period:{" "}
                  {Object.entries(usageSummary.trainer_usage)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([key, count]) => `${key.replace(/_/g, " ")} (${count} sessions)`)
                    .join(", ")}
                  .
                </p>
              )}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2 text-left font-medium text-slate-700">Trainer</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-700">Sessions</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-700">Questions</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-700">Time spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(usageSummary.trainer_usage)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([key, count]) => (
                        <tr key={key} className="border-b border-slate-100">
                          <td className="px-4 py-2 text-slate-700">{key.replace(/_/g, " ")}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">{String(count)}</td>
                          <td className="px-4 py-2 text-right text-slate-700">
                            {usageSummary.trainer_questions?.[key] != null
                              ? Number(usageSummary.trainer_questions[key]).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {formatTimeSeconds(usageSummary.trainer_time_seconds?.[key])}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {Object.keys(usageSummary.guest_activity).length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Guest activity (anon)</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <ul className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                    {Object.entries(usageSummary.guest_activity)
                      .sort(([, a], [, b]) => b - a)
                      .map(([eventName, count]) => (
                        <li key={eventName} className="px-4 py-2 flex justify-between text-sm">
                          <span className="text-slate-700">{eventName}</span>
                          <span className="font-medium text-slate-900">{count}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </section>
            )}

            <section className="mb-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Per-user activity</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-slate-600">
                    Min questions:{" "}
                    <input
                      type="number"
                      min={0}
                      value={userFilterMinQuestions}
                      onChange={(e) => setUserFilterMinQuestions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-20 px-2 py-1 border border-slate-200 rounded text-slate-900"
                    />
                  </label>
                  <input
                    type="search"
                    placeholder="Filter by email"
                    value={userFilterEmail}
                    onChange={(e) => setUserFilterEmail(e.target.value)}
                    className="min-w-[160px] px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = filterAndSortUsers(usageSummary.users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail);
                      const headers = ["display_name", "email", "last_active_at", "total_questions", "session_correct", "session_questions", "accuracy_pct", "total_time_seconds", "time_formatted", "days_active", "last_wpm", "avg_wpm", "speed_reading", "rapid_recall", "keyword_scanning", "calculator", "inference_trainer", "mental_maths", "syllogism_micro", "syllogism_macro"];
                      const escape = (v: string | number | null) => {
                        if (v == null) return "";
                        const s = String(v);
                        if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
                        return s;
                      };
                      const toCell = (val: unknown): string | number | null =>
                        val === null || val === undefined ? null : typeof val === "string" || typeof val === "number" ? val : String(val);
                      const rows = filtered.map((u) => {
                        const acc = (u.session_questions ?? 0) > 0 ? ((u.session_correct ?? 0) / (u.session_questions ?? 1) * 100).toFixed(1) : "";
                        const row: Record<string, string | number | null> = {
                          display_name: u.display_name || "",
                          email: u.email || "",
                          last_active_at: u.last_active_at ?? "",
                          total_questions: u.total_questions,
                          session_correct: u.session_correct ?? "",
                          session_questions: u.session_questions ?? "",
                          accuracy_pct: acc,
                          total_time_seconds: u.total_time_seconds ?? "",
                          time_formatted: formatTimeSeconds(u.total_time_seconds),
                          days_active: u.days_active ?? "",
                          last_wpm: u.last_wpm ?? "",
                          avg_wpm: u.avg_wpm ?? "",
                          speed_reading: u.speed_reading,
                          rapid_recall: u.rapid_recall,
                          keyword_scanning: u.keyword_scanning,
                          calculator: u.calculator,
                          inference_trainer: u.inference_trainer,
                          mental_maths: u.mental_maths,
                          syllogism_micro: u.syllogism_micro,
                          syllogism_macro: u.syllogism_macro,
                        };
                        return headers.map((h) => escape(toCell(row[h]))).join(",");
                      });
                      downloadText("admin-users-export.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
                    }}
                    className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {USER_TABLE_COLUMNS.map(({ key, label }) => (
                        <th
                          key={key}
                          className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-100"
                          onClick={() => {
                            if (userSortKey === key) setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            else setUserSortKey(key);
                          }}
                        >
                          {label}
                          {userSortKey === key ? (userSortDir === "asc" ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterAndSortUsers(usageSummary.users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail).map((u) => (
                      <tr key={u.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                        {USER_TABLE_COLUMNS.map(({ key }) => {
                          if (key === "display_name") return <td key={key} className="px-2 py-2 text-slate-900 font-medium">{u.display_name || "—"}</td>;
                          if (key === "email") return <td key={key} className="px-2 py-2 text-slate-700">{u.email || "—"}</td>;
                          if (key === "last_active_at") return <td key={key} className="px-2 py-2 text-slate-600 text-xs">{u.last_active_at ? new Date(u.last_active_at).toLocaleString() : "—"}</td>;
                          if (key === "accuracy") {
                            const total = u.session_questions ?? 0;
                            const correct = u.session_correct ?? 0;
                            const pct = total > 0 ? ((correct / total) * 100).toFixed(1) : "—";
                            return <td key={key} className="px-2 py-2 text-right">{pct}</td>;
                          }
                          if (key === "total_time_seconds") return <td key={key} className="px-2 py-2 text-right text-slate-700">{formatTimeSeconds(u.total_time_seconds)}</td>;
                          if (key === "days_active") return <td key={key} className="px-2 py-2 text-right">{u.days_active ?? "—"}</td>;
                          if (key === "last_wpm") return <td key={key} className="px-2 py-2 text-right">{u.last_wpm != null ? u.last_wpm : "—"}</td>;
                          const val = u[key];
                          const num = typeof val === "number" ? val : null;
                          return <td key={key} className="px-2 py-2 text-right">{num != null ? num : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filterAndSortUsers(usageSummary.users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail).length === 0 && (
                  <p className="px-4 py-6 text-slate-500 text-center">No users match the filters.</p>
                )}
              </div>
            </section>
          </>
        )}

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
                <p className="px-4 py-1 text-xs text-slate-500 border-b border-slate-100">What each event means (in selected date range)</p>
                <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {Object.entries(analytics.event_counts ?? {}).length === 0 ? (
                    <li className="px-4 py-3 text-slate-500 text-sm">No events in range</li>
                  ) : (
                    Object.entries(analytics.event_counts ?? {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([name, count]) => (
                        <li key={name} className="px-4 py-2 flex justify-between items-baseline gap-2 text-sm">
                          <span className="text-slate-700 min-w-0">
                            <span className="font-medium">{EVENT_LABELS[name] ?? name.replace(/_/g, " ")}</span>
                            {EVENT_LABELS[name] && <span className="text-slate-400 text-xs ml-1">({name})</span>}
                          </span>
                          <span className="font-medium text-slate-900 shrink-0">{String(count)}</span>
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
            {analytics.signups_by_day && analytics.signups_by_day.length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">New sign-ups over time</h3>
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
              <p className="mt-4 text-sm text-slate-500">No sign-ups in this date range for the chart.</p>
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
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-medium text-slate-600">Completed after start:</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {Object.entries(analytics.funnel)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([type, counts]) => {
                        const started = counts.trainer_started ?? 0;
                        const completed = counts.trainer_completed ?? 0;
                        const pct = started > 0 ? ((completed / started) * 100).toFixed(1) : "—";
                        return `${type.replace(/_/g, " ")}: ${pct}%`;
                      })
                      .join(" · ")}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {questionFeedback.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Question feedback (DM & VR)</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportQuestionFeedbackCsv(questionFeedback)}
                  className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportQuestionFeedbackJson(questionFeedback)}
                  className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export JSON
                </button>
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              Per-question reports from Decision Making syllogisms and Verbal Reasoning trainers. Use this to find
              confusing or flawed items.
            </p>
            <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              {(() => {
                const aggregatesMap = new Map<
                  string,
                  {
                    trainer_type: string;
                    question_kind: string;
                    question_identifier: string;
                    passage_id: string | null;
                    total: number;
                    last_created_at: string;
                    issues: Record<QuestionFeedbackIssueType, number>;
                  }
                >();
                questionFeedback.forEach((row) => {
                  const key = `${row.trainer_type}::${row.question_identifier}`;
                  let entry = aggregatesMap.get(key);
                  if (!entry) {
                    entry = {
                      trainer_type: row.trainer_type,
                      question_kind: row.question_kind,
                      question_identifier: row.question_identifier,
                      passage_id: row.passage_id,
                      total: 0,
                      last_created_at: row.created_at,
                      issues: {
                        wrong_answer: 0,
                        unclear_wording: 0,
                        too_hard: 0,
                        too_easy: 0,
                        typo: 0,
                        other: 0,
                      },
                    };
                    aggregatesMap.set(key, entry);
                  }
                  entry.total += 1;
                  entry.issues[row.issue_type] += 1;
                  if (row.created_at > entry.last_created_at) {
                    entry.last_created_at = row.created_at;
                  }
                });
                const aggregates = Array.from(aggregatesMap.values()).sort(
                  (a, b) => b.total - a.total
                );
                return (
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 text-left font-medium text-slate-700">
                          Trainer
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">
                          Question ID
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">
                          Passage ID
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Reports
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Wrong
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Unclear
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Too hard
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Too easy
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Typos
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          Last reported
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregates.map((row) => (
                        <tr key={`${row.trainer_type}:${row.question_identifier}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {row.trainer_type.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-2 text-slate-800 font-mono text-xs">
                            {row.question_identifier}
                          </td>
                          <td className="px-3 py-2 text-slate-700 text-xs">
                            {row.passage_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {row.total}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800">
                            {row.issues.wrong_answer || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800">
                            {row.issues.unclear_wording || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800">
                            {row.issues.too_hard || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800">
                            {row.issues.too_easy || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800">
                            {row.issues.typo || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">
                            {new Date(row.last_created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Bugs & feedback</h2>
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
