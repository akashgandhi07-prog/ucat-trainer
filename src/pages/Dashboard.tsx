import { useEffect, useState, useMemo } from "react";
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
import { useAuth } from "../hooks/useAuth";
import { useBugReportModal } from "../contexts/BugReportContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { supabase } from "../lib/supabase";
import { dashboardLog } from "../lib/logger";
import {
  getWpmComparisonCopy,
  getWpmTier,
  getWpmTierLabel,
  WPM_BENCHMARK,
} from "../lib/wpmBenchmark";
import { TRAINING_TYPE_LABELS } from "../types/training";
import type { TrainingType } from "../types/training";
import { PASSAGES } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { getGuestSessions } from "../lib/guestSessions";

type SessionRow = {
  id: string;
  user_id: string;
  training_type?: string | null;
  wpm?: number | null;
  correct: number;
  total: number;
  created_at: string;
  passage_id?: string | null;
  time_seconds?: number | null;
};

type ChartPoint = {
  date: string;
  wpm: number;
  displayDate: string;
};

type GuestDashboardSummary = {
  totalSessions: number;
  speedReadingCount: number;
  rapidRecallCount: number;
  keywordScanningCount: number;
  averageWpm: number | null;
};

function getTrainingType(s: SessionRow): TrainingType {
  const t = s.training_type;
  if (t === "speed_reading" || t === "rapid_recall" || t === "keyword_scanning")
    return t;
  return "speed_reading";
}

const SESSIONS_FETCH_RETRIES = 2;
const WPM_TARGET = 600;
const TARGET_WPM_STORAGE_KEY = "ukcat-target-wpm";

function getStoredTargetWpm(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TARGET_WPM_STORAGE_KEY);
  if (stored == null) return null;
  const n = parseInt(stored, 10);
  return Number.isFinite(n) && n >= 200 && n <= 900 ? n : null;
}

export default function Dashboard() {
  const {
    user,
    profile,
    loading: authLoading,
    sessionLoadFailed,
    retryGetSession,
  } = useAuth();
  const { openBugReport } = useBugReportModal();
  const { openAuthModal } = useAuthModal();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalTargetWpm, setPersonalTargetWpm] = useState<number | null>(
    () => getStoredTargetWpm()
  );
  const [targetWpmInput, setTargetWpmInput] = useState<string>(() => {
    const stored = getStoredTargetWpm();
    return stored != null ? String(stored) : "";
  });
  const [targetWpmError, setTargetWpmError] = useState<string | null>(null);
  const [guestSummary, setGuestSummary] = useState<GuestDashboardSummary | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const fetchSessions = async () => {
      if (cancelled) return;
      dashboardLog.info("Fetching sessions", { userId: user.id, attempt: attempt + 1 });

      const { data, error: err } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (err) {
        dashboardLog.error("Sessions fetch failed", { message: err.message, code: err.code, error: err });
        if (attempt < SESSIONS_FETCH_RETRIES) {
          attempt += 1;
          dashboardLog.info("Retrying sessions fetch", { nextAttempt: attempt + 1 });
          setTimeout(fetchSessions, 800);
          return;
        }
        if (cancelled) return;
        setError("Unable to load dashboard. Please try again later.");
        setSessions([]);
        setLoading(false);
        return;
      }

      const rows = (data as SessionRow[]) ?? [];
      dashboardLog.info("Sessions loaded", { userId: user.id, count: rows.length });
      if (cancelled) return;
      setSessions(rows);
      setError(null);
      setLoading(false);
    };

    fetchSessions();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      setGuestSummary(null);
      return;
    }
    const guestSessions = getGuestSessions();
    if (!guestSessions.length) {
      setGuestSummary(null);
      return;
    }
    const speed = guestSessions.filter((s) => s.training_type === "speed_reading");
    const rapid = guestSessions.filter((s) => s.training_type === "rapid_recall");
    const keyword = guestSessions.filter((s) => s.training_type === "keyword_scanning");
    const wpmValues = speed.map((s) => s.wpm ?? 0).filter((n) => Number.isFinite(n) && n > 0);
    const averageWpm =
      wpmValues.length > 0
        ? Math.round(wpmValues.reduce((sum, n) => sum + n, 0) / wpmValues.length)
        : null;
    setGuestSummary({
      totalSessions: guestSessions.length,
      speedReadingCount: speed.length,
      rapidRecallCount: rapid.length,
      keywordScanningCount: keyword.length,
      averageWpm,
    });
  }, [user]);

  const byType = useMemo(() => {
    const m: Record<TrainingType, SessionRow[]> = {
      speed_reading: [],
      rapid_recall: [],
      keyword_scanning: [],
    };
    for (const s of sessions) {
      m[getTrainingType(s)].push(s);
    }
    return m;
  }, [sessions]);

  const speedReadingSessions = byType.speed_reading;
  const lastSpeedSession = speedReadingSessions[speedReadingSessions.length - 1];
  const lastPassageTitle =
    lastSpeedSession?.passage_id != null
      ? PASSAGES.find((p) => p.id === lastSpeedSession.passage_id)?.title ?? null
      : null;

  const chartData: ChartPoint[] = speedReadingSessions
    .filter((s) => s.wpm != null)
    .map((s) => ({
      date: s.created_at,
      wpm: s.wpm ?? 0,
      displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  const speedWpmCount = speedReadingSessions.filter((s) => s.wpm != null).length;
  const averageWpm =
    speedWpmCount > 0
      ? Math.round(
          speedReadingSessions.reduce((sum, s) => sum + (s.wpm ?? 0), 0) / speedWpmCount
        )
      : 0;

  const speedReadingAccuracy =
    speedReadingSessions.length > 0
      ? Math.max(
          ...speedReadingSessions.map((s) =>
            s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
          )
        )
      : 0;

  const rapidRecallSessions = byType.rapid_recall;
  const rapidRecallAvg =
    rapidRecallSessions.length > 0
      ? Math.round(
          (rapidRecallSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
            rapidRecallSessions.length)
        )
      : 0;

  const keywordSessions = byType.keyword_scanning;
  const keywordAvg =
    keywordSessions.length > 0
      ? Math.round(
          (keywordSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
            keywordSessions.length)
        )
      : 0;
  const keywordSessionsWithTime = keywordSessions.filter(
    (s) => s.time_seconds != null && s.time_seconds > 0
  );
  const averageScanTimeSeconds =
    keywordSessionsWithTime.length > 0
      ? Math.round(
          keywordSessionsWithTime.reduce((sum, s) => sum + (s.time_seconds ?? 0), 0) /
            keywordSessionsWithTime.length
        )
      : null;

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    user?.email ||
    null;
  const greetingName = displayName || "Future Clinician";
  const streamLabel = profile?.stream ?? "-";
  const lastCheckUp =
    sessions.length > 0
      ? new Date(sessions[sessions.length - 1].created_at).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const lastSessionDate = useMemo(() => {
    if (sessions.length === 0) return null;
    const created = new Date(sessions[sessions.length - 1].created_at);
    created.setHours(0, 0, 0, 0);
    return created.getTime();
  }, [sessions]);
  const lastPracticedDaysAgo =
    lastSessionDate != null ? Math.floor((today - lastSessionDate) / (24 * 60 * 60 * 1000)) : null;
  const lastPracticedLabel =
    lastPracticedDaysAgo == null
      ? null
      : lastPracticedDaysAgo === 0
        ? "Today"
        : lastPracticedDaysAgo === 1
          ? "Yesterday"
          : `${lastPracticedDaysAgo} days ago`;
  const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;
  const uniqueDaysInLast7 = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const t = new Date(s.created_at).getTime();
      if (t >= sevenDaysAgo) {
        const d = new Date(t);
        d.setHours(0, 0, 0, 0);
        set.add(String(d.getTime()));
      }
    }
    return set.size;
  }, [sessions]);
  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const dateStrings = new Set(
      sessions.map((s) => {
        const d = new Date(s.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    let count = 0;
    let check = today;
    while (dateStrings.has(check)) {
      count++;
      check -= 24 * 60 * 60 * 1000;
    }
    return count;
  }, [sessions, today]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const renderGuestDashboard = () => {
    if (sessionLoadFailed) {
      return (
        <section className="mb-10">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-900 font-medium mb-2">
              We couldn&apos;t connect to your account right now.
            </p>
            <p className="text-slate-700 text-sm mb-4">
              You can still practice, but saving and syncing progress may be temporarily unavailable.
            </p>
            <button
              type="button"
              onClick={retryGetSession}
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry connection
            </button>
          </div>
        </section>
      );
    }

    if (!guestSummary) {
      return (
        <section className="mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
            <p className="text-slate-900 font-medium mb-2">
              Sign in to see your full dashboard.
            </p>
            <p className="text-slate-600 text-sm mb-4">
              You can train without an account, but creating one lets you save your history and track your WPM over time.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="min-h-[44px] px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create free account
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[44px] px-5 py-2.5 border border-slate-200 text-slate-800 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="mb-8">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <p className="text-amber-900 font-semibold mb-1">
              Guest dashboard
            </p>
            <p className="text-slate-800 text-sm mb-4">
              These stats are stored only on this device. Create a free account to sync them and unlock full analytics.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register to save progress
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[44px] px-4 py-2 border border-slate-200 text-sm font-medium text-slate-800 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total sessions</p>
              <p className="text-3xl font-bold text-slate-900">{guestSummary.totalSessions}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Speed Reading</p>
              <p className="text-2xl font-bold text-slate-900">{guestSummary.speedReadingCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Rapid Recall & Keyword</p>
              <p className="text-2xl font-bold text-slate-900">
                {guestSummary.rapidRecallCount + guestSummary.keywordScanningCount}
              </p>
            </div>
          </div>
        </section>
        {guestSummary.averageWpm != null && (
          <section className="mb-10">
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-100 p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Your typical WPM (guest)
              </p>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {guestSummary.averageWpm} WPM
              </p>
              <p className="text-xs text-slate-500">
                Based on your recent guest Speed Reading sessions on this device.
              </p>
            </div>
          </section>
        )}
      </>
    );
  };

  const renderAuthenticatedDashboard = () => {
    if (loading) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-slate-600">Loading dashboard…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Back to Home
          </Link>
        </div>
      );
    }

    return (
      <>
        <section className="mb-8">
          <div className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Clinical Record
              </h2>
            </div>
            <div className="p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-slate-500">Candidate Name:</span>
                <span className="text-slate-900 font-medium">{greetingName}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-slate-500">Target Stream:</span>
                <span className="text-slate-900 font-medium">{streamLabel}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Last Check-up:</span>
                <span className="text-slate-900 font-medium">{lastCheckUp}</span>
              </div>
            </div>
          </div>
        </section>

        {sessions.length === 0 ? (
          <section className="mb-10">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
              <p className="text-amber-900 font-serif text-lg mb-1">Rx</p>
              <p className="text-slate-800 font-medium mb-4">
                Establish your baseline speed.
              </p>
              <Link
                to="/?mode=speed_reading"
                className="inline-flex min-h-[44px] items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Calibration Test
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.speed_reading}
              </h2>
              {speedWpmCount > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-100 p-4 mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    How you compare
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-slate-900">{averageWpm} WPM</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getWpmTierLabel(getWpmTier(averageWpm))}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {getWpmComparisonCopy(averageWpm)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Most users read between {WPM_BENCHMARK.typicalMin}-{WPM_BENCHMARK.typicalMax} WPM. 400+ is strong.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Your typical WPM</p>
                  <p className="text-slate-500 text-xs mb-1">Average from your history</p>
                  <p className="text-3xl font-bold text-slate-900">{averageWpm}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Best comprehension accuracy</p>
                  <p className="text-3xl font-bold text-slate-900">{speedReadingAccuracy}%</p>
                </div>
              </div>
              {lastPassageTitle != null && (
                <p className="text-sm text-slate-500 mb-2">
                  Last passage: {lastPassageTitle}
                </p>
              )}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-base font-medium text-slate-900 mb-4">
                  WPM over time
                </h3>
                {chartData.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center">
                    Complete a Speed Reading session to see your WPM.
                  </p>
                ) : (
                  <>
                    <div className="h-64 sm:h-72 min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 12, fill: "#64748b" }}
                            stroke="#94a3b8"
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#64748b" }}
                            stroke="#94a3b8"
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.displayDate ?? ""
                            }
                            formatter={(value: number | undefined) => [`${value ?? 0} WPM`, "WPM"]}
                          />
                          <ReferenceLine
                            y={WPM_TARGET}
                            stroke="#dc2626"
                            strokeDasharray="4 4"
                            label={{ value: "Target", position: "right", fill: "#dc2626" }}
                          />
                          {personalTargetWpm != null &&
                            personalTargetWpm !== WPM_TARGET && (
                              <ReferenceLine
                                y={personalTargetWpm}
                                stroke="#0ea5e9"
                                strokeDasharray="2 2"
                                label={{
                                  value: "Your target",
                                  position: "right",
                                  fill: "#0ea5e9",
                                }}
                              />
                            )}
                          <Line
                            type="monotone"
                            dataKey="wpm"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ fill: "#2563eb", r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-slate-600 text-sm mt-3 text-center">
                      You&apos;re{" "}
                      {Math.min(
                        100,
                        Math.round((averageWpm / WPM_TARGET) * 100)
                      )}
                      % of the way to {WPM_TARGET} WPM.
                    </p>
                    <form
                      className="mt-3 flex flex-col items-center gap-2 text-xs text-slate-600"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const raw = targetWpmInput.trim();
                        if (raw === "") {
                          localStorage.removeItem(TARGET_WPM_STORAGE_KEY);
                          setPersonalTargetWpm(null);
                          setTargetWpmInput("");
                          setTargetWpmError(null);
                          return;
                        }
                        const n = Number.parseInt(raw, 10);
                        if (!Number.isFinite(n) || n < 200 || n > 900) {
                          setTargetWpmError("Please enter a value between 200 and 900 WPM, or leave blank to clear.");
                          return;
                        }
                        localStorage.setItem(TARGET_WPM_STORAGE_KEY, String(n));
                        setPersonalTargetWpm(n);
                        setTargetWpmError(null);
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <label htmlFor="target-wpm-input" className="sr-only">
                          Set personal target WPM
                        </label>
                        <span>Your personal target:</span>
                        <input
                          id="target-wpm-input"
                          type="number"
                          min={200}
                          max={900}
                          value={targetWpmInput}
                          onChange={(e) => {
                            setTargetWpmInput(e.target.value);
                            if (targetWpmError) setTargetWpmError(null);
                          }}
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        <span>WPM</span>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-slate-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem(TARGET_WPM_STORAGE_KEY);
                            setPersonalTargetWpm(null);
                            setTargetWpmInput("");
                            setTargetWpmError(null);
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      </div>
                      {targetWpmError && (
                        <p className="mt-1 text-[11px] text-red-600 text-center max-w-md">
                          {targetWpmError}
                        </p>
                      )}
                    </form>
                  </>
                )}
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.rapid_recall}
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                {rapidRecallSessions.length === 0 ? (
                  <p className="text-slate-500">No Rapid Recall sessions yet.</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-500">Average score</p>
                    <p className="text-2xl font-bold text-slate-900">{rapidRecallAvg}%</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {rapidRecallSessions.length} session{rapidRecallSessions.length !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.keyword_scanning}
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                {keywordSessions.length === 0 ? (
                  <p className="text-slate-500">No Keyword Scanning sessions yet.</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-500">Average accuracy</p>
                    <p className="text-2xl font-bold text-slate-900">{keywordAvg}%</p>
                    {averageScanTimeSeconds != null && (
                      <p className="text-slate-600 text-sm mt-2">
                        Average time to find all keywords: {averageScanTimeSeconds}s
                      </p>
                    )}
                    <p className="text-slate-500 text-sm mt-1">
                      {keywordSessions.length} session{keywordSessions.length !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </>
    );
  };

  if (authLoading) {
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
          <p className="text-slate-600">Loading your dashboard…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SEOHead
        title="UCAT Verbal Reasoning Dashboard & Analytics"
        description="Track your reading speed (WPM) and accuracy for the UCAT medical entrance exam. Free trainer for UK medical students."
        canonicalUrl={typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 py-8" tabIndex={-1}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user ? "Welcome back," : "Your reading dashboard"}
              {" "}
              {user ? greetingName : ""}
            </h1>
            {user && sessions.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                {lastPracticedLabel && (
                  <span>Last practiced: {lastPracticedLabel}</span>
                )}
                <span>Practiced on {uniqueDaysInLast7} days in the last 7</span>
                {streak > 0 && (
                  <span className="font-medium text-green-700">{streak}-day streak</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openBugReport}
              className="min-h-[44px] inline-flex items-center justify-center py-2 text-slate-600 hover:text-blue-600 font-medium transition-colors"
            >
              Feedback
            </button>
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center justify-center py-2 text-blue-600 font-medium hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {user ? renderAuthenticatedDashboard() : renderGuestDashboard()}
      </main>
      <Footer />
    </div>
  );
}
