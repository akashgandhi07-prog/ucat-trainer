import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
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
import { TRAINING_TYPE_LABELS, TRAINING_DIFFICULTY_LABELS } from "../types/training";
import type { TrainingType, TrainingDifficulty } from "../types/training";
import { PASSAGES } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ProductUpsell, { DashboardUpsellStack, StrategyCallBanner } from "../components/layout/ProductUpsell";
import {
  getUpsellProfileContext,
  hasActiveCourseUpsells,
  shouldShowDashboardTutoringUpsell,
} from "../lib/productUpsell";
import {
  UCAT_EXAM_YEAR,
  clampToUcatExamWindow,
  ucatExamDayRangeInMonth,
} from "../lib/ucatExamWindow";
import { getGuestSessions } from "../lib/guestSessions";
import { buildVrCategoryStats, deriveVrInsight } from "../lib/vrCategoryInsights";
import { getConversionTrainerDetailSessions } from "../lib/conversionTrainerStorage";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { trackEvent } from "../lib/analytics";
import { upsertProfile } from "../lib/profileApi";
import type { SessionRow } from "../types/session";
import type { SyllogismSession } from "../types/syllogisms";
import type { SJTSessionsRow } from "../types/sjt";
import { SJT_QUESTION_TYPE_LABELS } from "../types/sjt";
import { formatSJTSessionScore, getGuestSJTSessions } from "../lib/sjtSessionStorage";
import SyllogismAnalytics from "../components/dashboard/SyllogismAnalytics";
import SJTAnalytics from "../components/dashboard/SJTAnalytics";
import UnifiedProductHub from "../components/dashboard/UnifiedProductHub";
import DashboardHeroCard from "../components/dashboard/DashboardHeroCard";
import LatestMockCard from "../components/dashboard/LatestMockCard";
import TodayPlanStrip from "../components/dashboard/TodayPlanStrip";
import WeekSummaryCard from "../components/dashboard/WeekSummaryCard";
import { computeRollingDelta, StatDelta } from "../lib/dashboardDeltas";
import { isPlannerIntegrated } from "../lib/plannerUrl";
import { useAppShell } from "../contexts/AppShellContext";
import { APP_CONTENT_X, appContentWidthClass } from "../lib/appContentLayout";
import { cn } from "../lib/cn";

type ChartPoint = {
  date: string;
  wpm: number;
  displayDate: string;
};

type AccuracyChartPoint = {
  date: string;
  accuracy: number;
  displayDate: string;
};

/** Unified recent activity row (sessions table + syllogism_sessions) for dashboard. */
type RecentActivityItem = {
  id: string;
  created_at: string;
  label: string;
  timeDisplay: string;
  scoreDisplay: string;
  scorePercent?: number | null; // raw 0-100 value used for aggregation
  count?: number;               // set when multiple same-day sessions are merged
};

type DifficultyStats = {
  count: number;
  avgAccuracy: number;
};

type GuestDashboardSummary = {
  totalSessions: number;
  speedReadingCount: number;
  rapidRecallCount: number;
  keywordScanningCount: number;
  inferenceTrainerCount: number;
  calculatorCount: number;
  mentalMathsCount: number;
  unitConversionsCount: number;
  averageWpm: number | null;
  rapidRecallAvgAccuracy: number | null;
  keywordScanningAvgAccuracy: number | null;
  inferenceTrainerAvgAccuracy: number | null;
  calculatorAvgKps: string | null;
};

function getTrainingType(s: SessionRow): TrainingType {
  const t = s.training_type;
  if (t === "speed_reading" || t === "rapid_recall" || t === "keyword_scanning" || t === "calculator" || t === "inference_trainer" || t === "mental_maths" || t === "unit_conversions")
    return t;
  return "speed_reading";
}

/**
 * Calculator keystrokes-per-second. Cloud rows are migrated to the `kps` column
 * (wpm is null); the `wpm` fallback exists only for legacy guest localStorage entries.
 */
function getCalculatorKps(s: Pick<SessionRow, "wpm" | "kps">): number | null {
  return s.kps ?? s.wpm;
}

/**
 * Mental maths average ms per question. Cloud rows are migrated to the `avg_ms` column
 * (wpm is null); the `wpm` fallback exists only for legacy guest localStorage entries.
 */
function getMentalMathsAvgMs(s: Pick<SessionRow, "wpm" | "avg_ms">): number | null {
  return s.avg_ms ?? s.wpm;
}

function formatSessionScore(session: SessionRow): string {
  const type = getTrainingType(session);
  const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
  if (type === "speed_reading") {
    const wpm = session.wpm != null ? session.wpm : 0;
    return `${wpm} WPM`;
  }
  if (type === "calculator") {
    const kps = getCalculatorKps(session) ?? 0;
    return `${kps} KPS, ${pct}%`;
  }
  if (type === "mental_maths" || type === "unit_conversions") {
    return `${pct}%`;
  }
  return `${pct}%`;
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

function DashboardLoadingRefreshHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 2000);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
    >
      Taking too long? Refresh the page
    </button>
  );
}

function LockedDashboardPreview({
  onCreateAccount,
  onSignIn,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  const teaserStats = [
    { label: "Predicted weak area", value: "QR conversions", helper: "From accuracy trends" },
    { label: "7-day consistency", value: "5/7 days", helper: "Daily practice map" },
    { label: "Best recent score", value: "86%", helper: "Across all trainers" },
    { label: "WPM trajectory", value: "+42", helper: "Last 3 sessions" },
  ];
  const chartBars = [38, 48, 44, 58, 63, 71, 78, 74, 83, 88];
  const weakAreas = [
    { label: "Unit conversions", value: 42, color: "bg-foreground" },
    { label: "Inference evidence", value: 57, color: "bg-muted-foreground" },
    { label: "SJT appropriateness", value: 69, color: "bg-primary" },
  ];
  const activityRows = [
    ["Today", "Mental Maths", "78%"],
    ["Yesterday", "Decision Making", "82%"],
    ["Mon", "Keyword Scanning", "91%"],
    ["Sun", "SJT Ranking", "Band 1"],
  ];

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Free account preview
            </p>
            <h2 className="mt-3 text-xl font-bold text-foreground">
              See the dashboard your sessions build.
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Sign up free to unlock trends, weak-area tracking, recent activity, planner links and cross-device progress.
            </p>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none select-none blur-[3px] sm:blur-[4px]"
            aria-hidden="true"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teaserStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-secondary p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">WPM and accuracy trend</p>
                    <p className="text-xs text-muted-foreground">Last 10 saved sessions</p>
                  </div>
                  <span className="rounded-full bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Improving
                  </span>
                </div>
                <div className="flex h-44 items-end gap-2 rounded-lg bg-secondary px-3 py-3">
                  {chartBars.map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t-md bg-primary"
                        style={{ height: `${height}%` }}
                      />
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Weak-area breakdown</p>
                <p className="mb-4 text-xs text-muted-foreground">Know what to practise next.</p>
                <div className="space-y-4">
                  {weakAreas.map((area) => (
                    <div key={area.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{area.label}</span>
                        <span className="text-muted-foreground">{area.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${area.color}`} style={{ width: `${area.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Trainer</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map(([date, trainer, score]) => (
                    <tr key={`${date}-${trainer}`} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{date}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{trainer}</td>
                      <td className="px-4 py-3 text-foreground">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="absolute -top-20 bottom-0 inset-x-0 flex items-start justify-center bg-white/55 px-4 pt-8 backdrop-blur-[1px] sm:pt-10">
            <div className="max-w-md rounded-xl border border-border bg-white p-5 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Unlock your full progress dashboard.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Free account. Saved history. Better next-step recommendations.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onCreateAccount}
                  className="min-h-[44px] rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create free account
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="min-h-[44px] rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const inAppShell = useAppShell();
  const {
    user,
    profile,
    loading: authLoading,
    sessionLoadFailed,
    retryGetSession,
    refetchProfile,
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
  const [syllogismSessions, setSyllogismSessions] = useState<SyllogismSession[]>([]);
  const [sjtSessions, setSjtSessions] = useState<SJTSessionsRow[]>([]);

  // UCAT exam date: official sitting dates only (13 Jul to 24 Sep 2026).
  const [ucatYear, setUcatYear] = useState<number>(UCAT_EXAM_YEAR);
  const [ucatMonth, setUcatMonth] = useState<7 | 8 | 9>(7);
  const [ucatDay, setUcatDay] = useState(13);
  const [ucatSaveStatus, setUcatSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ucatSaveError, setUcatSaveError] = useState<string | null>(null);
  const [ucatEditing, setUcatEditing] = useState(false);

  type DashboardTab = "vr" | "dm" | "qr" | "sjt";
  const DASHBOARD_TAB_KEY = "ucat-dashboard-tab";
  const isValidTab = (v: unknown): v is DashboardTab => v === "vr" || v === "dm" || v === "qr" || v === "sjt";
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    try {
      const s = localStorage.getItem(DASHBOARD_TAB_KEY);
      if (isValidTab(s)) return s;
    } catch { /* ignore */ }
    return "vr";
  });
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showExamDateEditor, setShowExamDateEditor] = useState(false);
  const hasSetSmartDefault = useRef(false);
  const userId = user?.id;

  const UCAT_MONTH_NAMES: Record<number, string> = {
    7: "July",
    8: "August",
    9: "September",
  };
  const formatUcatDate = (iso: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!match) return iso;
    const d = parseInt(match[3], 10);
    const m = parseInt(match[2], 10);
    const y = match[1];
    return `${d} ${UCAT_MONTH_NAMES[m] ?? ""} ${y}`;
  };

  useEffect(() => {
    const raw = profile?.ucat_exam_date;
    if (!raw || typeof raw !== "string") return;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (!match) return;
    const clamped = clampToUcatExamWindow(`${match[1]}-${match[2]}-${match[3]}`);
    const cm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clamped);
    if (!cm) return;
    const y = parseInt(cm[1], 10);
    const m = parseInt(cm[2], 10);
    const d = parseInt(cm[3], 10);
    const range = ucatExamDayRangeInMonth(m);
    if (!range || y !== UCAT_EXAM_YEAR) return;
    setUcatYear(y);
    setUcatMonth(m as 7 | 8 | 9);
    setUcatDay(Math.min(Math.max(d, range.minDay), range.maxDay));
  }, [profile?.ucat_exam_date]);

  // Clamp day when month changes (window edge dates)
  useEffect(() => {
    const range = ucatExamDayRangeInMonth(ucatMonth);
    if (!range) return;
    if (ucatDay < range.minDay) setUcatDay(range.minDay);
    else if (ucatDay > range.maxDay) setUcatDay(range.maxDay);
  }, [ucatMonth, ucatDay]);

  // Track dashboard view once auth state is known (so we can tag authenticated vs guest)
  useEffect(() => {
    if (authLoading) return;
    trackEvent("dashboard_viewed", { authenticated: !!user });
  }, [authLoading, user]);

  // When authenticated and data has loaded, track dashboard_loaded and log once for ops
  const hasLoggedReady = useRef(false);
  useEffect(() => {
    if (!user || loading || error != null) return;
    if (hasLoggedReady.current) return;
    hasLoggedReady.current = true;
    dashboardLog.info("Dashboard ready (authenticated)", {
      session_count: sessions.length,
      syllogism_session_count: syllogismSessions.length,
      sjt_session_count: sjtSessions.length,
    });
    trackEvent("dashboard_loaded", {
      authenticated: true,
      session_count: sessions.length,
      syllogism_session_count: syllogismSessions.length,
      sjt_session_count: sjtSessions.length,
    });
  }, [user, loading, error, sessions.length, syllogismSessions.length, sjtSessions.length]);
  // Reset so a fresh load (e.g. after re-login) logs again
  useEffect(() => {
    if (!userId) hasLoggedReady.current = false;
  }, [userId]);


  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(null);
      setSessions([]);
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let timeoutId: number | null = null;
    let activeAbortController: AbortController | null = null;

    // Hard fallback: if the fetch loop never resolves (e.g. AbortError thrown instead of returned),
    // stop the loading spinner after 35s so the user isn't stuck forever.
    const hardTimeoutId = window.setTimeout(() => {
      if (!cancelled) {
        dashboardLog.warn("Dashboard hard timeout: sessions fetch never resolved", { userId });
        setError("Unable to load dashboard. Please try again later.");
        setSessions([]);
        setLoading(false);
      }
    }, 35_000);

    const fetchSessions = async () => {
      if (cancelled) return;
      dashboardLog.info("Fetching sessions", { userId, attempt: attempt + 1 });

      const abortController = new AbortController();
      activeAbortController = abortController;
      const FETCH_TIMEOUT_MS = 10000;

      timeoutId = window.setTimeout(() => {
        abortController.abort();
        dashboardLog.warn("Session fetch timed out", { userId, attempt: attempt + 1 });
      }, FETCH_TIMEOUT_MS);

      try {
        const { data, error: err } = await supabase
          .from("sessions")
          .select("id, user_id, training_type, difficulty, wpm, kps, avg_ms, correct, total, created_at, passage_id, time_seconds")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .abortSignal(abortController.signal);

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        activeAbortController = null;

        if (cancelled) return;

        if (err) {
          const isAborted = err.message?.includes("aborted") || err.message?.includes("abort");
          dashboardLog.error("Sessions fetch failed", {
            message: err.message,
            code: err.code,
            error: err,
            isTimeout: isAborted
          });
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
        dashboardLog.info("Sessions loaded", { userId, count: rows.length });
        if (cancelled) return;
        setSessions(rows);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        activeAbortController = null;
        if (cancelled) return;
        dashboardLog.error("Sessions fetch threw unexpectedly", { error: e });
        if (attempt < SESSIONS_FETCH_RETRIES) {
          attempt += 1;
          setTimeout(fetchSessions, 800);
          return;
        }
        setError("Unable to load dashboard. Please try again later.");
        setSessions([]);
        setLoading(false);
      }
    };

    fetchSessions();
    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeoutId);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      activeAbortController?.abort();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSyllogismSessions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("syllogism_sessions")
      .select("id, user_id, mode, score, total_questions, average_time_per_decision, categorical_accuracy, relative_accuracy, majority_accuracy, complex_accuracy, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          dashboardLog.warn("Syllogism sessions fetch failed", { message: error.message, code: error.code });
          setSyllogismSessions([]);
          return;
        }
        setSyllogismSessions((data as SyllogismSession[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSjtSessions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("sjt_sessions")
      .select(
        "id, user_id, question_id, question_type, domain, score, max_score, items_attempted, items_total, completed, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          dashboardLog.warn("SJT sessions fetch failed", { message: err.message, code: err.code });
          setSjtSessions([]);
          return;
        }
        setSjtSessions((data as SJTSessionsRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setGuestSummary(null);
      return;
    }
    const guestSessions = getGuestSessions();
    const guestSjt = getGuestSJTSessions();
    if (!guestSessions.length && !guestSjt.length) {
      setGuestSummary(null);
      dashboardLog.info("Dashboard ready (guest)", { guest_session_count: 0 });
      trackEvent("dashboard_loaded", { authenticated: false, guest_session_count: 0 });
      return;
    }
    const speed = guestSessions.filter((s) => s.training_type === "speed_reading");
    const rapid = guestSessions.filter((s) => s.training_type === "rapid_recall");
    const keyword = guestSessions.filter((s) => s.training_type === "keyword_scanning");
    const inference = guestSessions.filter((s) => s.training_type === "inference_trainer");
    const calculator = guestSessions.filter((s) => s.training_type === "calculator");
    const mentalMaths = guestSessions.filter((s) => s.training_type === "mental_maths");
    const unitConversions = guestSessions.filter((s) => s.training_type === "unit_conversions");
    const wpmValues = speed.map((s) => s.wpm ?? 0).filter((n) => Number.isFinite(n) && n > 0);
    const averageWpm =
      wpmValues.length > 0
        ? Math.round(wpmValues.reduce((sum, n) => sum + n, 0) / wpmValues.length)
        : null;
    const rapidAccValues = rapid.filter((s) => s.total > 0).map((s) => (s.correct / s.total) * 100);
    const rapidRecallAvgAccuracy = rapidAccValues.length > 0 ? Math.round(rapidAccValues.reduce((a, b) => a + b, 0) / rapidAccValues.length) : null;
    const kwAccValues = keyword.filter((s) => s.total > 0).map((s) => (s.correct / s.total) * 100);
    const keywordScanningAvgAccuracy = kwAccValues.length > 0 ? Math.round(kwAccValues.reduce((a, b) => a + b, 0) / kwAccValues.length) : null;
    const inferenceAccValues = inference.filter((s) => s.total > 0).map((s) => (s.correct / s.total) * 100);
    const inferenceTrainerAvgAccuracy = inferenceAccValues.length > 0 ? Math.round(inferenceAccValues.reduce((a, b) => a + b, 0) / inferenceAccValues.length) : null;
    // Guest entries may still carry KPS in the legacy wpm slot
    const calcKpsValues = calculator
      .map((s) => getCalculatorKps(s) ?? 0)
      .filter((n) => Number.isFinite(n) && n > 0);
    const calculatorAvgKps =
      calcKpsValues.length > 0
        ? (calcKpsValues.reduce((sum, n) => sum + n, 0) / calcKpsValues.length).toFixed(1)
        : null;
    setGuestSummary({
      totalSessions: guestSessions.length + guestSjt.length,
      speedReadingCount: speed.length,
      rapidRecallCount: rapid.length,
      keywordScanningCount: keyword.length,
      inferenceTrainerCount: inference.length,
      calculatorCount: calculator.length,
      mentalMathsCount: mentalMaths.length,
      unitConversionsCount: unitConversions.length,
      averageWpm,
      rapidRecallAvgAccuracy,
      keywordScanningAvgAccuracy,
      inferenceTrainerAvgAccuracy,
      calculatorAvgKps,
    });
    dashboardLog.info("Dashboard ready (guest)", {
      guest_session_count: guestSessions.length,
      guest_sjt_count: guestSjt.length,
    });
    trackEvent("dashboard_loaded", {
      authenticated: false,
      guest_session_count: guestSessions.length + guestSjt.length,
    });
  }, [userId]);

  const byType = useMemo(() => {
    const m: Record<TrainingType, SessionRow[]> = {
      speed_reading: [],
      rapid_recall: [],
      keyword_scanning: [],
      calculator: [],
      inference_trainer: [],
      mental_maths: [],
      unit_conversions: [],
    };
    for (const s of sessions) {
      m[getTrainingType(s)].push(s);
    }
    return m;
  }, [sessions]);

  const wpmDelta = useMemo(
    () => computeRollingDelta(byType.speed_reading, (s) => s.wpm),
    [byType.speed_reading],
  );
  const rapidAccDelta = useMemo(
    () =>
      computeRollingDelta(byType.rapid_recall, (s) =>
        s.total > 0 ? (s.correct / s.total) * 100 : null,
      ),
    [byType.rapid_recall],
  );
  const keywordAccDelta = useMemo(
    () =>
      computeRollingDelta(byType.keyword_scanning, (s) =>
        s.total > 0 ? (s.correct / s.total) * 100 : null,
      ),
    [byType.keyword_scanning],
  );
  const inferenceAccDelta = useMemo(
    () =>
      computeRollingDelta(byType.inference_trainer, (s) =>
        s.total > 0 ? (s.correct / s.total) * 100 : null,
      ),
    [byType.inference_trainer],
  );
  const calcKpsDelta = useMemo(
    () => computeRollingDelta(byType.calculator, (s) => getCalculatorKps(s)),
    [byType.calculator],
  );
  const mentalMathsTimeDelta = useMemo(
    () => computeRollingDelta(byType.mental_maths, (s) => getMentalMathsAvgMs(s)),
    [byType.mental_maths],
  );

  const openExamDateEditor = useCallback(() => {
    setShowExamDateEditor(true);
    setUcatEditing(true);
  }, []);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    try { localStorage.setItem(DASHBOARD_TAB_KEY, tab); } catch { /* ignore */ }
  }, [DASHBOARD_TAB_KEY]);

  // On first data load, if no stored preference, auto-select the tab with the most recent session.
  useEffect(() => {
    if (loading || hasSetSmartDefault.current) return;
    try {
      const stored = localStorage.getItem(DASHBOARD_TAB_KEY);
      if (isValidTab(stored)) { hasSetSmartDefault.current = true; return; }
    } catch { /* ignore */ }
    const vrSessions = [...byType.speed_reading, ...byType.rapid_recall, ...byType.keyword_scanning, ...byType.inference_trainer];
    const qrSessions = [...byType.calculator, ...byType.mental_maths, ...byType.unit_conversions];
    const candidates: { tab: DashboardTab; date: string }[] = [];
    if (vrSessions.length > 0) candidates.push({ tab: "vr", date: vrSessions[vrSessions.length - 1].created_at });
    if (qrSessions.length > 0) candidates.push({ tab: "qr", date: qrSessions[qrSessions.length - 1].created_at });
    if (syllogismSessions.length > 0) candidates.push({ tab: "dm", date: syllogismSessions[syllogismSessions.length - 1].created_at });
    if (sjtSessions.length > 0) candidates.push({ tab: "sjt", date: sjtSessions[sjtSessions.length - 1].created_at });
    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setActiveTab(best.tab);
    }
    hasSetSmartDefault.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isValidTab is a pure inline predicate; adding it would cause infinite re-runs
  }, [loading, byType, syllogismSessions, sjtSessions, DASHBOARD_TAB_KEY]);

  // Per-category VR insight, built from the rows already fetched (or guest
  // localStorage sessions) - no extra network call.
  const vrCategoryStats = useMemo(() => {
    const vrTypes = new Set<string>(["speed_reading", "rapid_recall", "keyword_scanning", "inference_trainer"]);
    const rows = userId
      ? sessions.filter((s) => vrTypes.has(s.training_type))
      : getGuestSessions().filter((s) => vrTypes.has(s.training_type));
    return buildVrCategoryStats(
      rows.map((s) => ({ passage_id: s.passage_id ?? null, correct: s.correct, total: s.total })),
    );
  }, [userId, sessions]);
  const vrCategoryInsight = useMemo(() => deriveVrInsight(vrCategoryStats), [vrCategoryStats]);

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
  const bestWpm =
    speedWpmCount > 0
      ? Math.max(...speedReadingSessions.filter((s) => s.wpm != null).map((s) => s.wpm ?? 0))
      : 0;

  const speedReadingAccuracy =
    speedReadingSessions.length > 0
      ? Math.max(
        ...speedReadingSessions.map((s) =>
          s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
        )
      )
      : 0;

  // Helper: compute difficulty breakdown for a set of sessions
  function computeDifficultyBreakdown(rows: SessionRow[]): Record<TrainingDifficulty, DifficultyStats> {
    const base: Record<TrainingDifficulty, DifficultyStats> = {
      easy: { count: 0, avgAccuracy: 0 },
      medium: { count: 0, avgAccuracy: 0 },
      hard: { count: 0, avgAccuracy: 0 },
    };
    const totals: Record<TrainingDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const s of rows) {
      const diff: TrainingDifficulty = (s.difficulty as TrainingDifficulty) ?? "medium";
      base[diff].count++;
      totals[diff] += s.total > 0 ? (s.correct / s.total) * 100 : 0;
    }
    for (const d of ["easy", "medium", "hard"] as TrainingDifficulty[]) {
      base[d].avgAccuracy = base[d].count > 0 ? Math.round(totals[d] / base[d].count) : 0;
    }
    return base;
  }

  // Helper: compute accuracy chart data
  function computeAccuracyChart(rows: SessionRow[]): AccuracyChartPoint[] {
    return rows
      .filter((s) => s.total > 0)
      .map((s) => ({
        date: s.created_at,
        accuracy: Math.round((s.correct / s.total) * 100),
        displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      }));
  }

  // Helper: format last session date
  function formatLastSession(rows: SessionRow[]): string | null {
    if (rows.length === 0) return null;
    return new Date(rows[rows.length - 1].created_at).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const speedDifficultyBreakdown = useMemo(() => computeDifficultyBreakdown(speedReadingSessions), [speedReadingSessions]);
  const speedAccuracyChart = useMemo(() => computeAccuracyChart(speedReadingSessions), [speedReadingSessions]);

  // --- Rapid Recall ---
  const rapidRecallSessions = byType.rapid_recall;
  const rapidRecallAvg =
    rapidRecallSessions.length > 0
      ? Math.round(
        (rapidRecallSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
          rapidRecallSessions.length)
      )
      : 0;
  const rapidBestScore =
    rapidRecallSessions.length > 0
      ? Math.max(...rapidRecallSessions.map((s) => s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0))
      : 0;
  const rapidSessionsWithTime = rapidRecallSessions.filter((s) => s.time_seconds != null && s.time_seconds > 0);
  const rapidAvgTime =
    rapidSessionsWithTime.length > 0
      ? Math.round(rapidSessionsWithTime.reduce((sum, s) => sum + (s.time_seconds ?? 0), 0) / rapidSessionsWithTime.length)
      : null;
  const rapidBestTime =
    rapidSessionsWithTime.length > 0
      ? Math.min(...rapidSessionsWithTime.map((s) => s.time_seconds ?? Infinity))
      : null;
  const rapidAccuracyChart = useMemo(() => computeAccuracyChart(rapidRecallSessions), [rapidRecallSessions]);
  const rapidDifficultyBreakdown = useMemo(() => computeDifficultyBreakdown(rapidRecallSessions), [rapidRecallSessions]);
  const rapidLastSession = useMemo(() => formatLastSession(rapidRecallSessions), [rapidRecallSessions]);

  // --- Keyword Scanning ---
  const keywordSessions = byType.keyword_scanning;
  const keywordAvg =
    keywordSessions.length > 0
      ? Math.round(
        (keywordSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
          keywordSessions.length)
      )
      : 0;
  const keywordBestAccuracy =
    keywordSessions.length > 0
      ? Math.max(...keywordSessions.map((s) => s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0))
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
  const keywordBestTime =
    keywordSessionsWithTime.length > 0
      ? Math.min(...keywordSessionsWithTime.map((s) => s.time_seconds ?? Infinity))
      : null;
  const keywordAccuracyChart = useMemo(() => computeAccuracyChart(keywordSessions), [keywordSessions]);
  const keywordDifficultyBreakdown = useMemo(() => computeDifficultyBreakdown(keywordSessions), [keywordSessions]);
  const keywordLastSession = useMemo(() => formatLastSession(keywordSessions), [keywordSessions]);

  // --- Inference Trainer ---
  const inferenceSessions = byType.inference_trainer;
  const inferenceAvg =
    inferenceSessions.length > 0
      ? Math.round(
          (inferenceSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
            inferenceSessions.length)
        )
      : 0;
  const inferenceBestAccuracy =
    inferenceSessions.length > 0
      ? Math.max(...inferenceSessions.map((s) => (s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0)))
      : 0;
  const inferenceAccuracyChart = useMemo(() => computeAccuracyChart(inferenceSessions), [inferenceSessions]);
  const inferenceDifficultyBreakdown = useMemo(() => computeDifficultyBreakdown(inferenceSessions), [inferenceSessions]);
  const inferenceLastSession = useMemo(() => formatLastSession(inferenceSessions), [inferenceSessions]);

  // --- Calculator Trainer ---
  const calculatorSessions = byType.calculator;
  const calculatorAvgAccuracy =
    calculatorSessions.length > 0
      ? Math.round(
        (calculatorSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
          calculatorSessions.length)
      )
      : 0;

  // Calculator speed lives in the kps column (legacy wpm fallback for guest rows)
  const calculatorKpsValues = calculatorSessions
    .filter(s => getCalculatorKps(s) != null)
    .map(s => getCalculatorKps(s) ?? 0);

  const calculatorAvgKps =
    calculatorKpsValues.length > 0
      ? (calculatorKpsValues.reduce((sum, k) => sum + k, 0) / calculatorKpsValues.length).toFixed(1)
      : "0.0";

  const calculatorBestKps =
    calculatorKpsValues.length > 0
      ? Math.max(...calculatorKpsValues).toFixed(1)
      : "0.0";

  const calculatorChartData: ChartPoint[] = calculatorSessions
    .filter((s) => getCalculatorKps(s) != null)
    .map((s) => ({
      date: s.created_at,
      wpm: getCalculatorKps(s) ?? 0, // This is KPS
      displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  const calculatorDrillBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; kpsSum: number; accSum: number }> = {};

    for (const s of calculatorSessions) {
      const mode = s.difficulty || 'free'; // 'difficulty' col holds mode
      if (!breakdown[mode]) {
        breakdown[mode] = { count: 0, kpsSum: 0, accSum: 0 };
      }
      breakdown[mode].count++;
      breakdown[mode].kpsSum += getCalculatorKps(s) ?? 0;
      breakdown[mode].accSum += s.total > 0 ? (s.correct / s.total) * 100 : 0;
    }

    // Finalize averages
    const result: Record<string, { count: number; avgKps: string; avgAccuracy: number }> = {};
    Object.entries(breakdown).forEach(([mode, stats]) => {
      result[mode] = {
        count: stats.count,
        avgKps: (stats.kpsSum / stats.count).toFixed(1),
        avgAccuracy: Math.round(stats.accSum / stats.count)
      };
    });
    return result;
  }, [calculatorSessions]);

  // --- Mental Maths Trainer ---
  const mentalMathsSessions = byType.mental_maths;
  const mentalMathsAvgAccuracy =
    mentalMathsSessions.length > 0
      ? Math.round(
          (mentalMathsSessions.reduce((sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0), 0) /
            mentalMathsSessions.length)
        )
      : 0;
  // avg_ms column stores average time per question in ms for mental_maths (legacy wpm fallback for guest rows)
  const mentalMathsWithAvgMs = mentalMathsSessions.filter((s) => getMentalMathsAvgMs(s) != null);
  const mentalMathsAvgTimeMs =
    mentalMathsWithAvgMs.length > 0
      ? Math.round(mentalMathsWithAvgMs.reduce((sum, s) => sum + (getMentalMathsAvgMs(s) ?? 0), 0) / mentalMathsWithAvgMs.length)
      : null;
  const mentalMathsChartData: ChartPoint[] = mentalMathsSessions
    .filter((s) => getMentalMathsAvgMs(s) != null)
    .slice(-10) // last 10 sessions (sessions are ordered created_at ascending)
    .map((s) => ({
      date: s.created_at,
      wpm: getMentalMathsAvgMs(s) ?? 0,
      displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  // --- Unit Conversions Trainer ---
  const unitConversionSessions = byType.unit_conversions;
  const unitConversionAvgAccuracy =
    unitConversionSessions.length > 0
      ? Math.round(
          unitConversionSessions.reduce(
            (sum, s) => sum + (s.total > 0 ? (s.correct / s.total) * 100 : 0),
            0,
          ) / unitConversionSessions.length,
        )
      : 0;
  const unitConversionBestAccuracy =
    unitConversionSessions.length > 0
      ? Math.max(
          ...unitConversionSessions.map((s) =>
            s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
          ),
        )
      : 0;
  const unitConversionAccDelta = useMemo(
    () =>
      computeRollingDelta(byType.unit_conversions, (s) =>
        s.total > 0 ? (s.correct / s.total) * 100 : null,
      ),
    [byType.unit_conversions],
  );
  const unitConversionChartData: AccuracyChartPoint[] = unitConversionSessions
    .slice(-10)
    .map((s) => ({
      date: s.created_at,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));
  const conversionDetailSessions = useMemo(
    () => getConversionTrainerDetailSessions(),
    [],
  );
  const conversionCategoryBreakdown = useMemo(() => {
    const totals: Record<string, { correct: number; total: number }> = {};
    for (const session of conversionDetailSessions) {
      for (const [category, stats] of Object.entries(session.categoryStats)) {
        const current = totals[category] ?? { correct: 0, total: 0 };
        current.correct += stats.correct;
        current.total += stats.total;
        totals[category] = current;
      }
    }
    return Object.entries(totals)
      .map(([category, stats]) => ({
        category,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  }, [conversionDetailSessions]);
  const conversionTopTrap = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const session of conversionDetailSessions) {
      for (const [trap, count] of Object.entries(session.trapStats)) {
        totals[trap] = (totals[trap] ?? 0) + count;
      }
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [conversionDetailSessions]);

  const recentActivity = useMemo((): RecentActivityItem[] => {
    const fromSessions: RecentActivityItem[] = sessions.map((s) => {
      const type = getTrainingType(s);
      const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
      const hasPercentScore = ["rapid_recall", "keyword_scanning", "inference_trainer", "mental_maths", "calculator", "unit_conversions"].includes(type);
      return {
        id: s.id,
        created_at: s.created_at,
        label: TRAINING_TYPE_LABELS[type],
        timeDisplay: s.time_seconds != null && s.time_seconds > 0 ? `${s.time_seconds}s` : "-",
        scoreDisplay: formatSessionScore(s),
        scorePercent: hasPercentScore ? pct : null,
      };
    });
    const fromSyllogism: RecentActivityItem[] = syllogismSessions.map((s) => {
      const linearPct = (s.mode === "micro" || s.mode === "foundation") && s.total_questions > 0
        ? Math.round((s.score / s.total_questions) * 100)
        : null;
      const label =
        s.mode === "macro"
          ? "Decision Making (Macro)"
          : s.mode === "foundation"
            ? "Decision Making (Foundations)"
            : "Decision Making (Micro)";
      return {
        id: `syllogism-${s.id}`,
        created_at: s.created_at,
        label,
        timeDisplay: s.average_time_per_decision > 0 ? `${Math.round(s.average_time_per_decision * s.total_questions)}s` : "-",
        scoreDisplay: s.mode === "macro" ? `${s.score} pts` : (s.total_questions > 0 ? `${Math.round((s.score / s.total_questions) * 100)}%` : "-"),
        scorePercent: linearPct,
      };
    });
    const fromSjt: RecentActivityItem[] = sjtSessions.map((s) => {
      const pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : null;
      return {
        id: `sjt-${s.id}`,
        created_at: s.created_at,
        label: SJT_QUESTION_TYPE_LABELS[s.question_type],
        timeDisplay: s.completed ? "-" : `${s.items_attempted}/${s.items_total} items`,
        scoreDisplay: formatSJTSessionScore(s),
        scorePercent: s.completed ? pct : null,
      };
    });

    // Sort most-recent first
    const merged = [...fromSessions, ...fromSyllogism, ...fromSjt].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Aggregate same-day same-trainer runs into one row
    const groups = new Map<string, RecentActivityItem[]>();
    const groupOrder: string[] = [];
    for (const item of merged) {
      const day = item.created_at.slice(0, 10);
      const key = `${day}__${item.label}`;
      if (!groups.has(key)) {
        groups.set(key, []);
        groupOrder.push(key);
      }
      groups.get(key)!.push(item);
    }

    const aggregated = groupOrder.map((key) => {
      const items = groups.get(key)!;
      if (items.length === 1) return items[0];
      const scores = items.map((i) => i.scorePercent).filter((s): s is number => s != null);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return {
        id: items[0].id,
        created_at: items[0].created_at,
        label: items[0].label,
        timeDisplay: "-",
        scoreDisplay: avgScore != null ? `${avgScore}%` : "-",
        scorePercent: avgScore,
        count: items.length,
      } satisfies RecentActivityItem;
    });

    return aggregated.slice(0, 30);
  }, [sessions, syllogismSessions, sjtSessions]);

  // Shared difficulty breakdown renderer
  const renderDifficultyBreakdown = (breakdown: Record<TrainingDifficulty, DifficultyStats>) => {
    const hasSessions = breakdown.easy.count + breakdown.medium.count + breakdown.hard.count > 0;
    if (!hasSessions) return null;
    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">By Difficulty</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["easy", "medium", "hard"] as TrainingDifficulty[]).map((d) => (
            <div key={d} className="bg-secondary rounded-lg px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">{TRAINING_DIFFICULTY_LABELS[d]}</p>
              <p className="text-sm font-bold text-foreground">{breakdown[d].count > 0 ? `${breakdown[d].avgAccuracy}%` : "-"}</p>
              <p className="text-[10px] text-muted-foreground">{breakdown[d].count} session{breakdown[d].count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Shared accuracy chart renderer
  const renderAccuracyChart = (data: AccuracyChartPoint[], label: string) => {
    if (data.length < 2) return null;
    return (
      <div className="bg-card rounded-xl border border-border p-4 mt-4">
        <h3 className="text-base font-medium text-foreground mb-4">{label}</h3>
        <div className="h-52 sm:h-60 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: "#64748b" }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.displayDate ?? ""}
                formatter={(value: number | undefined) => [`${value ?? 0}%`, "Accuracy"]}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    user?.email ||
    null;
  const greetingName = displayName || "Future Clinician";

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
  const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;
  const uniqueDaysInLast7 = useMemo(() => {
    const set = new Set<string>();
    const allDates = [
      ...sessions.map((s) => s.created_at),
      ...syllogismSessions.map((s) => s.created_at),
      ...sjtSessions.map((s) => s.created_at),
    ];
    for (const createdAt of allDates) {
      const t = new Date(createdAt).getTime();
      if (t >= sevenDaysAgo) {
        const d = new Date(t);
        d.setHours(0, 0, 0, 0);
        set.add(String(d.getTime()));
      }
    }
    return set.size;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sevenDaysAgo derived from stable today
  }, [sessions, syllogismSessions, sjtSessions]);
  const streak = useMemo(() => {
    const allSessions = [
      ...sessions,
      ...syllogismSessions.map((s) => ({ created_at: s.created_at })),
      ...sjtSessions.map((s) => ({ created_at: s.created_at })),
    ];
    if (allSessions.length === 0) return 0;
    const dateStrings = new Set(
      allSessions.map((s) => {
        const d = new Date(s.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    );
    let count = 0;
    let check = today;
    while (dateStrings.has(check)) {
      count++;
      check -= 24 * 60 * 60 * 1000;
    }
    return count;
  }, [sessions, syllogismSessions, sjtSessions, today]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const renderGuestDashboard = () => {
    if (sessionLoadFailed) {
      return (
        <section className="mb-10">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-900 font-medium mb-2">
              We couldn&apos;t connect to your account right now.
            </p>
            <p className="text-foreground text-sm mb-4">
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
        <div className="mb-10 space-y-6">
          <section className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-foreground font-medium mb-2">
              Sign in to see your full dashboard.
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              You can train without an account. Sign in only if you want your history saved across devices.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create free account
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[44px] px-5 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                Sign in
              </button>
            </div>
          </section>
          <LockedDashboardPreview
            onCreateAccount={() => openAuthModal("register")}
            onSignIn={() => openAuthModal("login")}
          />
        </div>
      );
    }

    return (
      <>
        {isPlannerIntegrated() ? <UnifiedProductHub /> : null}
        <section className="mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-foreground font-semibold mb-1">
              Guest dashboard
            </p>
            <p className="text-foreground text-sm mb-4">
              These stats are stored only on this device. Create a free account to sync them and unlock full analytics.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openAuthModal("register")}
              className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Register to save progress
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[44px] px-4 py-2 border border-border text-sm font-medium text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Total sessions</p>
              <p className="text-3xl font-bold text-foreground">{guestSummary.totalSessions}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Speed Reading</p>
              <p className="text-2xl font-bold text-foreground">{guestSummary.speedReadingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">session{guestSummary.speedReadingCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Rapid Recall</p>
              <p className="text-2xl font-bold text-foreground">{guestSummary.rapidRecallCount}</p>
              {guestSummary.rapidRecallAvgAccuracy != null && (
                <p className="text-xs text-muted-foreground mt-1">Avg accuracy: {guestSummary.rapidRecallAvgAccuracy}%</p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Keyword Scanning</p>
              <p className="text-2xl font-bold text-foreground">{guestSummary.keywordScanningCount}</p>
              {guestSummary.keywordScanningAvgAccuracy != null && (
                <p className="text-xs text-muted-foreground mt-1">Avg accuracy: {guestSummary.keywordScanningAvgAccuracy}%</p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Inference Trainer</p>
              <p className="text-2xl font-bold text-foreground">{guestSummary.inferenceTrainerCount}</p>
              {guestSummary.inferenceTrainerAvgAccuracy != null && (
                <p className="text-xs text-muted-foreground mt-1">Avg accuracy: {guestSummary.inferenceTrainerAvgAccuracy}%</p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Calculator</p>
              <p className="text-2xl font-bold text-foreground">{guestSummary.calculatorCount}</p>
              {guestSummary.calculatorAvgKps != null && (
                <p className="text-xs text-muted-foreground mt-1">Avg speed: {guestSummary.calculatorAvgKps} KPS</p>
              )}
            </div>
            {/* QR guest summary */}
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">QR skills</p>
              <p className="text-2xl font-bold text-foreground">
                {guestSummary.mentalMathsCount + guestSummary.unitConversionsCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Mental maths + conversions</p>
            </div>
          </div>
        </section>
        {guestSummary.averageWpm != null && (
          <section className="mb-10">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Your typical WPM (guest)
              </p>
              <p className="text-3xl font-bold text-foreground mb-1">
                {guestSummary.averageWpm} WPM
              </p>
              <p className="text-xs text-muted-foreground">
                Based on your recent guest Speed Reading sessions on this device.
              </p>
            </div>
          </section>
        )}
        <section className="mb-10">
          <LockedDashboardPreview
            onCreateAccount={() => openAuthModal("register")}
            onSignIn={() => openAuthModal("login")}
          />
        </section>
      </>
    );
  };

  const renderAuthenticatedDashboard = () => {
    if (loading) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Loading dashboard…</p>
          <DashboardLoadingRefreshHint />
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Back to Home
          </Link>
        </div>
      );
    }

    const hasAnySessions =
      sessions.length > 0 || syllogismSessions.length > 0 || sjtSessions.length > 0;

    const vrCount = byType.speed_reading.length + byType.rapid_recall.length + byType.keyword_scanning.length + byType.inference_trainer.length;
    const dmCount = syllogismSessions.length;
    const qrCount = byType.calculator.length + byType.mental_maths.length + byType.unit_conversions.length;
    const sjtCount = sjtSessions.length;

    const TABS: { id: DashboardTab; label: string; shortLabel: string; count: number; path: string }[] = [
      { id: "vr", label: "Verbal Reasoning", shortLabel: "Verbal", count: vrCount, path: "/ucat-verbal-reasoning-practice" },
      { id: "dm", label: "Decision Making", shortLabel: "Decision", count: dmCount, path: "/ucat-decision-making-practice" },
      { id: "qr", label: "Quantitative", shortLabel: "Quant", count: qrCount, path: "/ucat-quantitative-reasoning-practice" },
      { id: "sjt", label: "Situational Judgement", shortLabel: "SJT", count: sjtCount, path: "/ucat-sjt-practice" },
    ];

    return (
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
        <div className="min-w-0 flex-1 space-y-4">

          {/* ── Hero ── */}
          <DashboardHeroCard
            name={greetingName}
            streak={streak}
            lastPracticedDaysAgo={lastPracticedDaysAgo}
            examDateISO={profile?.ucat_exam_date ?? null}
            totalSessions={sessions.length + syllogismSessions.length + sjtSessions.length}
            uniqueDaysInLast7={uniqueDaysInLast7}
            onSetExamDate={openExamDateEditor}
            onEditExamDate={openExamDateEditor}
          />

          {/* ── Inline exam date editor ── */}
          {user && (showExamDateEditor || !profile?.ucat_exam_date) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">UCAT exam date</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Official sittings · 13 July to 24 September {UCAT_EXAM_YEAR}</p>
                </div>
                {profile?.ucat_exam_date && showExamDateEditor && (
                  <button
                    type="button"
                    onClick={() => { setShowExamDateEditor(false); setUcatEditing(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {profile?.ucat_exam_date && !ucatEditing ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-secondary border border-border px-3 py-2">
                    <span className="text-foreground font-medium">{formatUcatDate(profile.ucat_exam_date)}</span>
                    <span className="text-emerald-600 text-xs font-medium">Saved</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUcatEditing(true)}
                    className="min-h-[36px] rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary hover:border-slate-400 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={ucatDay}
                    onChange={(e) => setUcatDay(parseInt(e.target.value, 10))}
                    className="rounded border border-border bg-white px-2 py-1.5 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    aria-label="Exam day"
                  >
                    {(() => {
                      const range = ucatExamDayRangeInMonth(ucatMonth);
                      const min = range?.minDay ?? 1;
                      const max = range?.maxDay ?? 31;
                      return Array.from({ length: max - min + 1 }, (_, i) => i + min).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ));
                    })()}
                  </select>
                  <select
                    value={ucatMonth}
                    onChange={(e) => setUcatMonth(parseInt(e.target.value, 10) as 7 | 8 | 9)}
                    className="rounded border border-border bg-white px-2 py-1.5 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    aria-label="Exam month"
                  >
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                  </select>
                  <select
                    value={ucatYear}
                    onChange={(e) => setUcatYear(parseInt(e.target.value, 10))}
                    className="rounded border border-border bg-white px-2 py-1.5 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    aria-label="Exam year"
                  >
                    <option value={UCAT_EXAM_YEAR}>{UCAT_EXAM_YEAR}</option>
                  </select>
                  <button
                    type="button"
                    disabled={!user || ucatSaveStatus === "saving"}
                    onClick={async () => {
                      if (!user) return;
                      setUcatSaveStatus("saving");
                      const range = ucatExamDayRangeInMonth(ucatMonth);
                      if (!range) {
                        setUcatSaveStatus("error");
                        setTimeout(() => setUcatSaveStatus("idle"), 3000);
                        return;
                      }
                      const day = Math.min(Math.max(ucatDay, range.minDay), range.maxDay);
                      const iso = `${ucatYear}-${String(ucatMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      // Try the security-definer RPC first (migration 041); fall back to direct upsert.
                      let ok = false;
                      let saveErr: string | undefined;
                      const { error: rpcErr } = await supabase.rpc("set_ucat_exam_date", { p_exam_date: iso });
                      if (!rpcErr) {
                        ok = true;
                      } else {
                        const fallback = await upsertProfile(user.id, profile?.full_name ?? null, profile?.stream ?? null, { ucatExamDate: iso });
                        ok = fallback.ok;
                        saveErr = fallback.error;
                        if (!ok) saveErr = rpcErr.message || saveErr;
                      }
                      if (ok) {
                        setUcatSaveStatus("saved");
                        setUcatSaveError(null);
                        setUcatEditing(false);
                        setShowExamDateEditor(false);
                        await refetchProfile();
                        setTimeout(() => setUcatSaveStatus("idle"), 2000);
                      } else {
                        console.error("[exam date save]", saveErr);
                        setUcatSaveError(saveErr ?? "Unknown error");
                        setUcatSaveStatus("error");
                        setTimeout(() => setUcatSaveStatus("idle"), 5000);
                      }
                    }}
                    className="ml-1 min-h-[32px] rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
                  >
                    {ucatSaveStatus === "saving" ? "Saving…" : ucatSaveStatus === "saved" ? "Saved" : ucatSaveStatus === "error" ? "Error - try again" : "Save"}
                  </button>
                </div>
              )}
              {ucatSaveStatus === "error" && ucatSaveError && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">{ucatSaveError}</p>
              )}
            </div>
          )}

          {/* ── Plan / mock strips ── */}
          {user && <TodayPlanStrip userId={user.id} />}
          {user && <LatestMockCard userId={user.id} />}
          {isPlannerIntegrated() ? <UnifiedProductHub /> : null}

          {/* ── Week at a glance ── */}
          <WeekSummaryCard
            sessions={sessions}
            syllogismSessions={syllogismSessions}
            sjtSessions={sjtSessions}
          />

          {/* ── Recent activity (prominent, near top) ── */}
          {recentActivity.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
                {recentActivity.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAllActivity((v) => !v)}
                    className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                  >
                    {showAllActivity ? "Show less" : `View all ${recentActivity.length} sessions`}
                  </button>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    role="table"
                    aria-label="Recent training sessions"
                  >
                    <thead>
                      <tr className="border-b border-border bg-secondary">
                        <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Date
                        </th>
                        <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Trainer
                        </th>
                        <th
                          scope="col"
                          className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell"
                        >
                          Time
                        </th>
                        <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllActivity ? recentActivity : recentActivity.slice(0, 10)).map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border last:border-b-0 hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-4 py-3 text-foreground font-medium">
                            <span>{item.label}</span>
                            {item.count != null && item.count > 1 && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                ×{item.count}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {item.timeDisplay}
                          </td>
                          <td className="px-4 py-3 text-foreground">{item.scoreDisplay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── Subject deep-dives (tabbed) ── */}
          {!hasAnySessions ? (
            <div className="bg-secondary border border-border rounded-xl p-6 text-center">
              <p className="text-foreground font-medium mb-4">
                No sessions yet. Pick any trainer from the home page to get started.
              </p>
              <Link
                to="/"
                className="inline-flex min-h-[44px] items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Explore trainers
              </Link>
            </div>
          ) : (
            <div>
              {/* Tab nav */}
              <div className="mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Select a section to view analytics</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const colors = {
                      active:   "bg-foreground border-foreground text-card",
                      inactive: "bg-card border-border text-foreground hover:border-foreground/30 hover:bg-secondary",
                      badge:    isActive ? "bg-card/20 text-card" : "bg-secondary text-muted-foreground",
                    };
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                          "relative flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3 transition-all duration-150",
                          isActive ? colors.active : colors.inactive,
                        )}
                      >
                        <span className="text-sm font-semibold leading-tight text-center">
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="sm:hidden">{tab.shortLabel}</span>
                        </span>
                        <span className={cn(
                          "mt-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold px-2 py-0.5",
                          colors.badge,
                        )}>
                          {tab.count} session{tab.count !== 1 ? "s" : ""}
                        </span>
                        {isActive && (
                          <span className="mt-1 text-[8px] opacity-70">▼</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VR: Speed Reading · Rapid Recall · Keyword Scanning · Inference */}
              {activeTab === "vr" && (
                <div className="space-y-8">
                  {vrCategoryStats.length >= 2 && (
                    <section>
                      <div className="bg-card rounded-xl border border-border p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Verbal reasoning focus
                        </p>
                        {vrCategoryInsight != null && (
                          <p className="text-sm text-foreground mb-3">{vrCategoryInsight.message}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {vrCategoryStats.map((stat) => (
                            <span
                              key={stat.category}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground"
                            >
                              {stat.category}: {stat.accuracyPct}% over {stat.attempts} passage{stat.attempts !== 1 ? "s" : ""}
                            </span>
                          ))}
                        </div>
                        <Link
                          to="/ucat-verbal-reasoning-practice"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          Practise verbal reasoning →
                        </Link>
                      </div>
                    </section>
                  )}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">
                        {TRAINING_TYPE_LABELS.speed_reading}
                      </h2>
                      <Link
                        to="/ucat-verbal-reasoning-practice"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Practice now →
                      </Link>
                    </div>
                    {speedWpmCount > 0 && (
                      <div className="bg-card rounded-xl border border-border p-4 mb-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          How you compare
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-2xl font-bold text-foreground">{averageWpm} WPM</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                            {getWpmTierLabel(getWpmTier(averageWpm))}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{getWpmComparisonCopy(averageWpm)}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Most users read between {WPM_BENCHMARK.typicalMin}-
                          {WPM_BENCHMARK.typicalMax} WPM. 400+ is strong.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-sm font-medium text-muted-foreground">Your typical WPM</p>
                        <p className="text-muted-foreground text-xs mb-1">Average from your history</p>
                        <p className="text-3xl font-bold text-foreground">{averageWpm}</p>
                        <StatDelta delta={wpmDelta.delta} direction={wpmDelta.direction} unit=" WPM" />
                      </div>
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-sm font-medium text-muted-foreground">Best WPM</p>
                        <p className="text-3xl font-bold text-foreground">{bestWpm}</p>
                      </div>
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-sm font-medium text-muted-foreground">Best comprehension</p>
                        <p className="text-3xl font-bold text-foreground">{speedReadingAccuracy}%</p>
                      </div>
                    </div>
                    {lastPassageTitle != null && (
                      <p className="text-sm text-muted-foreground mb-2">Last passage: {lastPassageTitle}</p>
                    )}
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h3 className="text-base font-medium text-foreground mb-4">WPM over time</h3>
                      {chartData.length === 0 ? (
                        <p className="text-muted-foreground py-8 text-center">
                          Complete a Speed Reading session to see your WPM.
                        </p>
                      ) : (
                        <>
                          <div className="h-64 sm:h-72 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                              >
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
                                  formatter={(value: number | undefined) => [
                                    `${value ?? 0} WPM`,
                                    "WPM",
                                  ]}
                                />
                                <ReferenceLine
                                  y={WPM_TARGET}
                                  stroke="#dc2626"
                                  strokeDasharray="4 4"
                                  label={{
                                    value: "Target",
                                    position: "right",
                                    fill: "#dc2626",
                                  }}
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
                          <p className="text-muted-foreground text-sm mt-3 text-center">
                            You&apos;re{" "}
                            {Math.min(100, Math.round((averageWpm / WPM_TARGET) * 100))}% of the
                            way to {WPM_TARGET} WPM.
                          </p>
                          <form
                            className="mt-3 flex flex-col items-center gap-2 text-xs text-muted-foreground"
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
                                setTargetWpmError(
                                  "Please enter a value between 200 and 900 WPM, or leave blank to clear.",
                                );
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
                                className="w-20 rounded-md border border-border px-2 py-1 text-center text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                inputMode="numeric"
                                pattern="[0-9]*"
                              />
                              <span>WPM</span>
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-secondary"
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
                                className="inline-flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
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
                    {renderAccuracyChart(speedAccuracyChart, "Comprehension accuracy over time")}
                    {renderDifficultyBreakdown(speedDifficultyBreakdown)}
                  </section>

                  {(rapidRecallSessions.length > 0 || vrCount === 0) && (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {TRAINING_TYPE_LABELS.rapid_recall}
                    </h2>
                    {rapidRecallSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">No Rapid Recall sessions yet.</p>
                        <Link
                          to="/ucat-verbal-reasoning-practice"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Start Rapid Recall →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Average score</p>
                            <p className="text-2xl font-bold text-foreground">{rapidRecallAvg}%</p>
                            <StatDelta
                              delta={rapidAccDelta.delta}
                              direction={rapidAccDelta.direction}
                              unit="%"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best score</p>
                            <p className="text-2xl font-bold text-foreground">{rapidBestScore}%</p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Avg reading time</p>
                            <p className="text-2xl font-bold text-foreground">
                              {rapidAvgTime != null ? `${rapidAvgTime}s` : "-"}
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best time</p>
                            <p className="text-2xl font-bold text-foreground">
                              {rapidBestTime != null ? `${rapidBestTime}s` : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                          <span>
                            {rapidRecallSessions.length} session
                            {rapidRecallSessions.length !== 1 ? "s" : ""}
                          </span>
                          {rapidLastSession && <span>Last session: {rapidLastSession}</span>}
                        </div>
                        {renderAccuracyChart(rapidAccuracyChart, "Recall accuracy over time")}
                        <div className="bg-card rounded-xl border border-border p-5 mt-4">
                          {renderDifficultyBreakdown(rapidDifficultyBreakdown)}
                        </div>
                      </>
                    )}
                  </section>
                  )}

                  {(keywordSessions.length > 0 || vrCount === 0) && (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {TRAINING_TYPE_LABELS.keyword_scanning}
                    </h2>
                    {keywordSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">No Keyword Scanning sessions yet.</p>
                        <Link
                          to="/ucat-verbal-reasoning-practice"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Start Keyword Scanning →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Average accuracy</p>
                            <p className="text-2xl font-bold text-foreground">{keywordAvg}%</p>
                            <StatDelta
                              delta={keywordAccDelta.delta}
                              direction={keywordAccDelta.direction}
                              unit="%"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best accuracy</p>
                            <p className="text-2xl font-bold text-foreground">
                              {keywordBestAccuracy}%
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Avg scan time</p>
                            <p className="text-2xl font-bold text-foreground">
                              {averageScanTimeSeconds != null ? `${averageScanTimeSeconds}s` : "-"}
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best time</p>
                            <p className="text-2xl font-bold text-foreground">
                              {keywordBestTime != null ? `${keywordBestTime}s` : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                          <span>
                            {keywordSessions.length} session
                            {keywordSessions.length !== 1 ? "s" : ""}
                          </span>
                          {keywordLastSession && <span>Last session: {keywordLastSession}</span>}
                        </div>
                        {renderAccuracyChart(keywordAccuracyChart, "Scanning accuracy over time")}
                        <div className="bg-card rounded-xl border border-border p-5 mt-4">
                          {renderDifficultyBreakdown(keywordDifficultyBreakdown)}
                        </div>
                      </>
                    )}
                  </section>
                  )}

                  {(inferenceSessions.length > 0 || vrCount === 0) && (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {TRAINING_TYPE_LABELS.inference_trainer}
                    </h2>
                    {inferenceSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">
                          No Inference Trainer sessions yet. Practice identifying evidence that
                          supports inferences.
                        </p>
                        <Link
                          to="/train/inference"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Inference Trainer
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Average accuracy</p>
                            <p className="text-2xl font-bold text-foreground">{inferenceAvg}%</p>
                            <StatDelta
                              delta={inferenceAccDelta.delta}
                              direction={inferenceAccDelta.direction}
                              unit="%"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best accuracy</p>
                            <p className="text-2xl font-bold text-foreground">
                              {inferenceBestAccuracy}%
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                            <p className="text-2xl font-bold text-foreground">
                              {inferenceSessions.length}
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Last session</p>
                            <p className="text-lg font-bold text-foreground">
                              {inferenceLastSession ?? "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                          <span>
                            {inferenceSessions.length} session
                            {inferenceSessions.length !== 1 ? "s" : ""}
                          </span>
                          {inferenceLastSession && <span>Last: {inferenceLastSession}</span>}
                          <Link
                            to="/train/inference"
                            className="text-primary font-medium hover:underline"
                          >
                            Practice again →
                          </Link>
                        </div>
                        {renderAccuracyChart(inferenceAccuracyChart, "Accuracy over time")}
                        <div className="bg-card rounded-xl border border-border p-5 mt-4">
                          {renderDifficultyBreakdown(inferenceDifficultyBreakdown)}
                        </div>
                      </>
                    )}
                  </section>
                  )}

                  {/* Compact "also try" strip for untried VR trainers */}
                  {vrCount > 0 && (rapidRecallSessions.length === 0 || keywordSessions.length === 0 || inferenceSessions.length === 0) && (
                    <div className="rounded-lg border border-border bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Also try</span>
                      {rapidRecallSessions.length === 0 && (
                        <Link to="/ucat-verbal-reasoning-practice" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                          Rapid Recall →
                        </Link>
                      )}
                      {keywordSessions.length === 0 && (
                        <Link to="/ucat-verbal-reasoning-practice" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                          Keyword Scanning →
                        </Link>
                      )}
                      {inferenceSessions.length === 0 && (
                        <Link to="/train/inference" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                          Inference Trainer →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DM: Syllogisms */}
              {activeTab === "dm" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Decision Making</h2>
                    <Link
                      to="/ucat-decision-making-practice"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Practice now →
                    </Link>
                  </div>
                  <SyllogismAnalytics sessions={syllogismSessions} />
                </div>
              )}

              {/* QR: Calculator · Mental Maths */}
              {activeTab === "qr" && (
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">
                        {TRAINING_TYPE_LABELS.calculator}
                      </h2>
                      <Link
                        to="/ucat-quantitative-reasoning-practice"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Practice now →
                      </Link>
                    </div>
                    {calculatorSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">
                          No Calculator sessions yet. Start the Calculator Trainer to track your
                          speed.
                        </p>
                        <Link
                          to="/train/calculator"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Calculator
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Your Average KPS</p>
                            <p className="text-3xl font-bold text-foreground">{calculatorAvgKps}</p>
                            <StatDelta
                              delta={calcKpsDelta.delta}
                              direction={calcKpsDelta.direction}
                              unit=" KPS"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best KPS</p>
                            <p className="text-3xl font-bold text-foreground">{calculatorBestKps}</p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Avg Accuracy</p>
                            <p className="text-3xl font-bold text-foreground">
                              {calculatorAvgAccuracy}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 mb-4">
                          <h3 className="text-sm font-medium text-foreground mb-3">
                            Performance by Mode
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(calculatorDrillBreakdown).map(([mode, stats]) => (
                              <div key={mode} className="bg-secondary p-3 rounded-lg text-center">
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                                  {mode === "fingerTwister" ? "Twister" : mode}
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                  {stats.avgKps}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">KPS</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {stats.avgAccuracy}% Acc ({stats.count})
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4">
                          <h3 className="text-base font-medium text-foreground mb-4">KPS Progress</h3>
                          <div className="h-64 sm:h-72 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={calculatorChartData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                              >
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
                                  formatter={(value: number | undefined) => [
                                    `${value ?? 0} KPS`,
                                    "Speed",
                                  ]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="wpm"
                                  stroke="#4f46e5"
                                  strokeWidth={2}
                                  dot={{ fill: "#4f46e5", r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    )}
                  </section>

                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {TRAINING_TYPE_LABELS.mental_maths}
                    </h2>
                    {mentalMathsSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">
                          No Mental Maths sessions yet. Build speed and estimation without the
                          calculator.
                        </p>
                        <Link
                          to="/train/mentalMaths"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Mental Maths Trainer
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Avg accuracy</p>
                            <p className="text-3xl font-bold text-foreground">
                              {mentalMathsAvgAccuracy}%
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">
                              Avg time per question
                            </p>
                            <p className="text-3xl font-bold text-foreground">
                              {mentalMathsAvgTimeMs != null
                                ? `${(mentalMathsAvgTimeMs / 1000).toFixed(1)}s`
                                : "-"}
                            </p>
                            <StatDelta
                              delta={
                                mentalMathsTimeDelta.delta != null
                                  ? Math.round(mentalMathsTimeDelta.delta / 1000)
                                  : null
                              }
                              direction={mentalMathsTimeDelta.direction}
                              invertGood
                              unit="s"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                            <p className="text-3xl font-bold text-foreground">
                              {mentalMathsSessions.length}
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Latest stage</p>
                            <p className="text-2xl font-bold text-foreground">
                              {mentalMathsSessions.length > 0 &&
                              mentalMathsSessions[mentalMathsSessions.length - 1]?.difficulty
                                ? String(
                                    mentalMathsSessions[mentalMathsSessions.length - 1].difficulty,
                                  ).replace("stage_", "Stage ")
                                : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4">
                          <h3 className="text-base font-medium text-foreground mb-4">
                            Avg time per question (last 10 sessions)
                          </h3>
                          <div className="h-64 sm:h-72 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={mentalMathsChartData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                              >
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
                                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`}
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
                                  formatter={(value: number | undefined) => [
                                    `${((value ?? 0) / 1000).toFixed(1)}s`,
                                    "Avg time",
                                  ]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="wpm"
                                  stroke="#7c3aed"
                                  strokeWidth={2}
                                  dot={{ fill: "#7c3aed", r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    )}
                  </section>

                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {TRAINING_TYPE_LABELS.unit_conversions}
                    </h2>
                    {unitConversionSessions.length === 0 ? (
                      <div className="bg-card rounded-xl border border-border p-5">
                        <p className="text-muted-foreground">
                          No Conversions sessions yet. Practise the unit traps that cost easy QR marks.
                        </p>
                        <Link
                          to="/train/conversions"
                          className="inline-flex mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Conversions Trainer
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Avg accuracy</p>
                            <p className="text-3xl font-bold text-foreground">
                              {unitConversionAvgAccuracy}%
                            </p>
                            <StatDelta
                              delta={unitConversionAccDelta.delta}
                              direction={unitConversionAccDelta.direction}
                              unit="%"
                            />
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Best accuracy</p>
                            <p className="text-3xl font-bold text-foreground">
                              {unitConversionBestAccuracy}%
                            </p>
                          </div>
                          <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                            <p className="text-3xl font-bold text-foreground">
                              {unitConversionSessions.length}
                            </p>
                          </div>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4">
                          <h3 className="text-base font-medium text-foreground mb-4">
                            Accuracy progress (last 10 sessions)
                          </h3>
                          <div className="h-64 sm:h-72 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={unitConversionChartData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="displayDate"
                                  tick={{ fontSize: 12, fill: "#64748b" }}
                                  stroke="#94a3b8"
                                />
                                <YAxis
                                  tick={{ fontSize: 12, fill: "#64748b" }}
                                  stroke="#94a3b8"
                                  domain={[0, 100]}
                                  tickFormatter={(v) => `${v}%`}
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
                                  formatter={(value: number | undefined) => [
                                    `${value ?? 0}%`,
                                    "Accuracy",
                                  ]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="accuracy"
                                  stroke="#059669"
                                  strokeWidth={2}
                                  dot={{ fill: "#059669", r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        {conversionCategoryBreakdown.length > 0 && (
                          <div className="bg-card rounded-xl border border-border p-4 mt-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                              <div>
                                <h3 className="text-base font-medium text-foreground">
                                  Weak-area breakdown
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Based on the detailed conversion sessions saved on this device.
                                </p>
                              </div>
                              {conversionTopTrap && (
                                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm">
                                  <p className="font-medium text-amber-900">Most common trap</p>
                                  <p className="text-amber-800">
                                    {conversionTopTrap[0]} · {conversionTopTrap[1]} miss
                                    {conversionTopTrap[1] === 1 ? "" : "es"}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              {conversionCategoryBreakdown.slice(0, 6).map((item) => (
                                <div key={item.category}>
                                  <div className="flex items-center justify-between gap-3 text-sm mb-1">
                                    <span className="font-medium text-foreground">{item.category}</span>
                                    <span className="text-muted-foreground">
                                      {item.accuracy}% · {item.correct}/{item.total}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{ width: `${item.accuracy}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                </div>
              )}

              {/* SJT: score, type breakdown, domain breakdown */}
              {activeTab === "sjt" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Situational Judgement</h2>
                    <Link
                      to="/ucat-sjt-practice"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Practice now →
                    </Link>
                  </div>
                  <SJTAnalytics sessions={sjtSessions} />
                </div>
              )}
            </div>
          )}
        </div>

        <aside
          className="shrink-0 w-full lg:w-72 lg:sticky lg:top-6 lg:self-start space-y-4"
          aria-label="Optional courses and tutoring"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Boost your prep
          </h2>
          <StrategyCallBanner variant="card" />
          <DashboardUpsellStack
            rail
            stream={profile?.stream ?? null}
            firstName={getUpsellProfileContext(user, profile).firstName}
            showTutoring={shouldShowDashboardTutoringUpsell(sessions)}
          />
        </aside>
      </div>
    );
  };

  if (authLoading) {
    if (inAppShell) {
      return (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-muted-foreground">Loading your dashboard…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-muted-foreground">Loading your dashboard…</p>
        </main>
        <Footer />
      </div>
    );
  }

  const base = getSiteBaseUrl();
  const dashboardCanonical = base ? `${base}/dashboard` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Dashboard", url: `${base}/dashboard` },
      ]
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-col bg-secondary",
        inAppShell ? "flex-1 min-h-0" : "min-h-screen",
      )}
    >
      <SEOHead
        title="UCAT Practice Dashboard & Analytics"
        description="Track your UCAT practice progress across Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement. Free trainer for UK medical applicants."
        canonicalUrl={dashboardCanonical}
        breadcrumbs={breadcrumbs}
        noindex
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      {!inAppShell && <Header />}
      <main
        id="main-content"
        className={cn(
          "flex-1 py-8",
          inAppShell
            ? cn(APP_CONTENT_X, appContentWidthClass({ inAppShell }))
            : "max-w-4xl mx-auto px-4",
        )}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user
                ? profile?.full_name?.trim().split(" ")[0]
                  ? `${profile.full_name.trim().split(" ")[0]}'s dashboard`
                  : "Your dashboard"
                : "Your UCAT dashboard"}
            </h1>
            {!user && (
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to save progress and unlock your full analytics.
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openBugReport}
              className="min-h-[44px] inline-flex items-center justify-center py-2 text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              Feedback
            </button>
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center justify-center py-2 text-primary font-medium hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {user ? renderAuthenticatedDashboard() : renderGuestDashboard()}
        {!user && hasActiveCourseUpsells() ? (
          <div className="mt-8">
            <ProductUpsell variant="hero" offer="course" placement="dashboard_hero" dismissible />
          </div>
        ) : null}
      </main>
      {!inAppShell && <Footer />}
    </div>
  );
}
