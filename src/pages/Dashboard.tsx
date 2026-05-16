import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
import { TRAINING_TYPE_LABELS, TRAINING_DIFFICULTY_LABELS } from "../types/training";
import type { TrainingType, TrainingDifficulty } from "../types/training";
import { PASSAGES } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ProductUpsell, { DashboardUpsellStack } from "../components/layout/ProductUpsell";
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
import { getSiteBaseUrl } from "../lib/siteUrl";
import { trackEvent } from "../lib/analytics";
import { upsertProfile, type Stream } from "../lib/profileApi";
import type { SessionRow } from "../types/session";
import type { SyllogismSession } from "../types/syllogisms";
import type { SJTSessionsRow } from "../types/sjt";
import { SJT_QUESTION_TYPE_LABELS } from "../types/sjt";
import { formatSJTSessionScore, getGuestSJTSessions } from "../lib/sjtSessionStorage";
import SyllogismAnalytics from "../components/dashboard/SyllogismAnalytics";
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
  mentalMathsCount: number;
  averageWpm: number | null;
  rapidRecallAvgAccuracy: number | null;
  keywordScanningAvgAccuracy: number | null;
};

function getTrainingType(s: SessionRow): TrainingType {
  const t = s.training_type;
  if (t === "speed_reading" || t === "rapid_recall" || t === "keyword_scanning" || t === "calculator" || t === "inference_trainer" || t === "mental_maths")
    return t;
  return "speed_reading";
}

function formatSessionScore(session: SessionRow): string {
  const type = getTrainingType(session);
  const pct = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
  if (type === "speed_reading") {
    const wpm = session.wpm != null ? session.wpm : 0;
    return `${wpm} WPM`;
  }
  if (type === "calculator") {
    const kps = session.wpm != null ? session.wpm : 0;
    return `${kps} KPS, ${pct}%`;
  }
  if (type === "mental_maths") {
    const stage = session.difficulty ?? "stage_1";
    const stageLabel = stage.replace("stage_", "Stage ");
    return `${stageLabel}, ${pct}%`;
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
  const [ucatEditing, setUcatEditing] = useState(false);

  // Target stream edit (Clinical Record)
  const STREAM_OPTIONS: { value: Stream; label: string }[] = [
    { value: "Medicine", label: "Medicine" },
    { value: "Dentistry", label: "Dentistry" },
    { value: "Veterinary Medicine", label: "Veterinary Medicine" },
    { value: "Other", label: "Other" },
    { value: "Undecided", label: "Undecided" },
  ];
  const [streamEditing, setStreamEditing] = useState(false);
  const [streamEditValue, setStreamEditValue] = useState<Stream>("Medicine");
  const [streamSaveStatus, setStreamSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (streamEditing && profile?.stream) setStreamEditValue(profile.stream);
    else if (!streamEditing) setStreamEditValue(profile?.stream ?? "Medicine");
  }, [streamEditing, profile?.stream]);

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
    if (!user) hasLoggedReady.current = false;
  }, [user]);


  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError(null);
      setSessions([]);
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let timeoutId: number | null = null;

    const fetchSessions = async () => {
      if (cancelled) return;
      dashboardLog.info("Fetching sessions", { userId: user.id, attempt: attempt + 1 });

      // Create AbortController for timeout
      const abortController = new AbortController();
      const FETCH_TIMEOUT_MS = 10000; // 10 seconds

      timeoutId = window.setTimeout(() => {
        abortController.abort();
        dashboardLog.warn("Session fetch timed out", { userId: user.id, attempt: attempt + 1 });
      }, FETCH_TIMEOUT_MS);

      const { data, error: err } = await supabase
        .from("sessions")
        .select("id, user_id, training_type, difficulty, wpm, correct, total, created_at, passage_id, time_seconds")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .abortSignal(abortController.signal);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

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
      dashboardLog.info("Sessions loaded", { userId: user.id, count: rows.length });
      if (cancelled) return;
      setSessions(rows);
      setError(null);
      setLoading(false);
    };

    fetchSessions();
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSyllogismSessions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("syllogism_sessions")
      .select("id, user_id, mode, score, total_questions, average_time_per_decision, categorical_accuracy, relative_accuracy, majority_accuracy, complex_accuracy, created_at")
      .eq("user_id", user.id)
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSjtSessions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("sjt_sessions")
      .select(
        "id, user_id, question_id, question_type, domain, score, max_score, items_attempted, items_total, completed, created_at",
      )
      .eq("user_id", user.id)
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
  }, [user]);

  useEffect(() => {
    if (user) {
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
    const mentalMaths = guestSessions.filter((s) => s.training_type === "mental_maths");
    const wpmValues = speed.map((s) => s.wpm ?? 0).filter((n) => Number.isFinite(n) && n > 0);
    const averageWpm =
      wpmValues.length > 0
        ? Math.round(wpmValues.reduce((sum, n) => sum + n, 0) / wpmValues.length)
        : null;
    const rapidAccValues = rapid.filter((s) => s.total > 0).map((s) => (s.correct / s.total) * 100);
    const rapidRecallAvgAccuracy = rapidAccValues.length > 0 ? Math.round(rapidAccValues.reduce((a, b) => a + b, 0) / rapidAccValues.length) : null;
    const kwAccValues = keyword.filter((s) => s.total > 0).map((s) => (s.correct / s.total) * 100);
    const keywordScanningAvgAccuracy = kwAccValues.length > 0 ? Math.round(kwAccValues.reduce((a, b) => a + b, 0) / kwAccValues.length) : null;
    setGuestSummary({
      totalSessions: guestSessions.length + guestSjt.length,
      speedReadingCount: speed.length,
      rapidRecallCount: rapid.length,
      keywordScanningCount: keyword.length,
      mentalMathsCount: mentalMaths.length,
      averageWpm,
      rapidRecallAvgAccuracy,
      keywordScanningAvgAccuracy,
    });
    dashboardLog.info("Dashboard ready (guest)", {
      guest_session_count: guestSessions.length,
      guest_sjt_count: guestSjt.length,
    });
    trackEvent("dashboard_loaded", {
      authenticated: false,
      guest_session_count: guestSessions.length + guestSjt.length,
    });
  }, [user]);

  const byType = useMemo(() => {
    const m: Record<TrainingType, SessionRow[]> = {
      speed_reading: [],
      rapid_recall: [],
      keyword_scanning: [],
      calculator: [],
      inference_trainer: [],
      mental_maths: [],
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
    () => computeRollingDelta(byType.calculator, (s) => s.wpm),
    [byType.calculator],
  );
  const mentalMathsTimeDelta = useMemo(
    () => computeRollingDelta(byType.mental_maths, (s) => s.wpm),
    [byType.mental_maths],
  );

  const scrollToExamDate = useCallback(() => {
    document.getElementById("dashboard-exam-date")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setUcatEditing(true);
  }, []);

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

  // WPM column stores KPS for calculator
  const calculatorKpsValues = calculatorSessions
    .filter(s => s.wpm != null)
    .map(s => s.wpm ?? 0);

  const calculatorAvgKps =
    calculatorKpsValues.length > 0
      ? (calculatorKpsValues.reduce((sum, k) => sum + k, 0) / calculatorKpsValues.length).toFixed(1)
      : "0.0";

  const calculatorBestKps =
    calculatorKpsValues.length > 0
      ? Math.max(...calculatorKpsValues).toFixed(1)
      : "0.0";

  const calculatorChartData: ChartPoint[] = calculatorSessions
    .filter((s) => s.wpm != null)
    .map((s) => ({
      date: s.created_at,
      wpm: s.wpm ?? 0, // This is KPS
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
      breakdown[mode].kpsSum += s.wpm ?? 0;
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
  // wpm column stores average time per question in ms for mental_maths
  const mentalMathsWithWpm = mentalMathsSessions.filter((s) => s.wpm != null);
  const mentalMathsAvgTimeMs =
    mentalMathsWithWpm.length > 0
      ? Math.round(mentalMathsWithWpm.reduce((sum, s) => sum + (s.wpm ?? 0), 0) / mentalMathsWithWpm.length)
      : null;
  const mentalMathsChartData: ChartPoint[] = mentalMathsSessions
    .filter((s) => s.wpm != null)
    .slice(-10) // last 10 sessions (sessions are ordered created_at ascending)
    .map((s) => ({
      date: s.created_at,
      wpm: s.wpm ?? 0,
      displayDate: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  const recentActivity = useMemo((): RecentActivityItem[] => {
    const fromSessions: RecentActivityItem[] = sessions.map((s) => {
      const type = getTrainingType(s);
      return {
        id: s.id,
        created_at: s.created_at,
        label: TRAINING_TYPE_LABELS[type],
        timeDisplay:
          s.time_seconds != null && s.time_seconds > 0 ? `${s.time_seconds}s` : "-",
        scoreDisplay: formatSessionScore(s),
      };
    });
    const fromSyllogism: RecentActivityItem[] = syllogismSessions.map((s) => ({
      id: `syllogism-${s.id}`,
      created_at: s.created_at,
      label: s.mode === "macro" ? "Decision Making (Macro)" : "Decision Making (Micro)",
      timeDisplay: s.average_time_per_decision > 0 ? `${Math.round(s.average_time_per_decision * s.total_questions)}s` : "-",
      scoreDisplay: s.mode === "macro" ? `${s.score} pts` : `${s.score} / ${s.total_questions} correct`,
    }));
    const fromSjt: RecentActivityItem[] = sjtSessions.map((s) => ({
      id: `sjt-${s.id}`,
      created_at: s.created_at,
      label: SJT_QUESTION_TYPE_LABELS[s.question_type],
      timeDisplay: s.completed ? "-" : `${s.items_attempted}/${s.items_total} items`,
      scoreDisplay: formatSJTSessionScore(s),
    }));
    const merged = [...fromSessions, ...fromSyllogism, ...fromSjt].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return merged.slice(0, 30);
  }, [sessions, syllogismSessions, sjtSessions]);

  // Shared difficulty breakdown renderer
  const renderDifficultyBreakdown = (breakdown: Record<TrainingDifficulty, DifficultyStats>) => {
    const hasSessions = breakdown.easy.count + breakdown.medium.count + breakdown.hard.count > 0;
    if (!hasSessions) return null;
    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">By Difficulty</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["easy", "medium", "hard"] as TrainingDifficulty[]).map((d) => (
            <div key={d} className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[11px] font-medium text-slate-500">{TRAINING_DIFFICULTY_LABELS[d]}</p>
              <p className="text-sm font-bold text-slate-900">{breakdown[d].count > 0 ? `${breakdown[d].avgAccuracy}%` : "-"}</p>
              <p className="text-[10px] text-slate-400">{breakdown[d].count} session{breakdown[d].count !== 1 ? "s" : ""}</p>
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-4">
        <h3 className="text-base font-medium text-slate-900 mb-4">{label}</h3>
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
          </div>
        </section>
      );
    }

    return (
      <>
        {isPlannerIntegrated() ? <UnifiedProductHub /> : null}
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
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total sessions</p>
              <p className="text-3xl font-bold text-slate-900">{guestSummary.totalSessions}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Speed Reading</p>
              <p className="text-2xl font-bold text-slate-900">{guestSummary.speedReadingCount}</p>
              <p className="text-xs text-slate-400 mt-1">session{guestSummary.speedReadingCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Rapid Recall</p>
              <p className="text-2xl font-bold text-slate-900">{guestSummary.rapidRecallCount}</p>
              {guestSummary.rapidRecallAvgAccuracy != null && (
                <p className="text-xs text-slate-500 mt-1">Avg accuracy: {guestSummary.rapidRecallAvgAccuracy}%</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Keyword Scanning</p>
              <p className="text-2xl font-bold text-slate-900">{guestSummary.keywordScanningCount}</p>
              {guestSummary.keywordScanningAvgAccuracy != null && (
                <p className="text-xs text-slate-500 mt-1">Avg accuracy: {guestSummary.keywordScanningAvgAccuracy}%</p>
              )}
            </div>
            {/* Calculator (Guest Placeholder) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Calculator</p>
              <p className="text-2xl font-bold text-slate-900">-</p>
              <p className="text-xs text-slate-500 mt-1">Sign in to track</p>
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
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
        <div className="min-w-0 flex-1 space-y-4">
        <DashboardHeroCard
          name={greetingName}
          streak={streak}
          lastPracticedDaysAgo={lastPracticedDaysAgo}
          examDateISO={profile?.ucat_exam_date ?? null}
          totalSessions={sessions.length + syllogismSessions.length + sjtSessions.length}
          uniqueDaysInLast7={uniqueDaysInLast7}
          onSetExamDate={scrollToExamDate}
        />
        {user && <TodayPlanStrip userId={user.id} />}
        {user && <LatestMockCard userId={user.id} />}
        <div className="space-y-8 pt-2">
        {isPlannerIntegrated() ? <UnifiedProductHub /> : null}
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
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 items-center">
                <span className="text-slate-500">Target Stream:</span>
                {streamEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={streamEditValue}
                      onChange={(e) => setStreamEditValue(e.target.value as Stream)}
                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      aria-label="Target stream"
                    >
                      {STREAM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={streamSaveStatus === "saving"}
                      onClick={async () => {
                        if (!user || !profile) return;
                        setStreamSaveStatus("saving");
                        const { ok } = await upsertProfile(user.id, profile.full_name ?? null, streamEditValue);
                        if (ok) {
                          setStreamSaveStatus("saved");
                          setStreamEditing(false);
                          await refetchProfile();
                          setTimeout(() => setStreamSaveStatus("idle"), 2000);
                        } else {
                          setStreamSaveStatus("error");
                          setTimeout(() => setStreamSaveStatus("idle"), 3000);
                        }
                      }}
                      className="min-h-[32px] rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
                    >
                      {streamSaveStatus === "saving" ? "Saving…" : streamSaveStatus === "saved" ? "Saved" : streamSaveStatus === "error" ? "Error" : "Save"}
                    </button>
                    {profile?.stream && (
                      <button
                        type="button"
                        onClick={() => setStreamEditing(false)}
                        className="min-h-[32px] rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-medium">{streamLabel}</span>
                    <button
                      type="button"
                      onClick={() => setStreamEditing(true)}
                      className="min-h-[32px] rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Last Check-up:</span>
                <span className="text-slate-900 font-medium">{lastCheckUp}</span>
              </div>
              {user && (
                <div id="dashboard-exam-date" className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-slate-500">UCAT exam date:</span>
                    <span className="text-xs text-slate-400">
                      Official sittings · 13 July to 24 September {UCAT_EXAM_YEAR}
                    </span>
                  </div>
                  {profile?.ucat_exam_date && !ucatEditing ? (
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <span className="text-slate-800 font-medium" aria-label="Saved exam date">
                          {formatUcatDate(profile.ucat_exam_date)}
                        </span>
                        <span className="text-emerald-600 text-xs font-medium">Saved</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUcatEditing(true)}
                        className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={ucatDay}
                        onChange={(e) => setUcatDay(parseInt(e.target.value, 10))}
                        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        aria-label="Exam day"
                      >
                        {(() => {
                          const range = ucatExamDayRangeInMonth(ucatMonth);
                          const min = range?.minDay ?? 1;
                          const max = range?.maxDay ?? 31;
                          return Array.from({ length: max - min + 1 }, (_, i) => i + min).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ));
                        })()}
                      </select>
                      <select
                        value={ucatMonth}
                        onChange={(e) => setUcatMonth(parseInt(e.target.value, 10) as 7 | 8 | 9)}
                        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        aria-label="Exam month"
                      >
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                      </select>
                      <select
                        value={ucatYear}
                        onChange={(e) => setUcatYear(parseInt(e.target.value, 10))}
                        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        aria-label="Exam year"
                      >
                        <option value={UCAT_EXAM_YEAR}>{UCAT_EXAM_YEAR}</option>
                      </select>
                      <button
                        type="button"
                        disabled={ucatSaveStatus === "saving"}
                        onClick={async () => {
                          if (!user || !profile) return;
                          setUcatSaveStatus("saving");
                          const range = ucatExamDayRangeInMonth(ucatMonth);
                          if (!range) {
                            setUcatSaveStatus("error");
                            setTimeout(() => setUcatSaveStatus("idle"), 3000);
                            return;
                          }
                          const day = Math.min(Math.max(ucatDay, range.minDay), range.maxDay);
                          const iso = `${ucatYear}-${String(ucatMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const { ok } = await upsertProfile(user.id, profile.full_name ?? null, profile.stream ?? null, { ucatExamDate: iso });
                          if (ok) {
                            setUcatSaveStatus("saved");
                            setUcatEditing(false);
                            await refetchProfile();
                            setTimeout(() => setUcatSaveStatus("idle"), 2000);
                          } else {
                            setUcatSaveStatus("error");
                            setTimeout(() => setUcatSaveStatus("idle"), 3000);
                          }
                        }}
                        className="ml-1 min-h-[32px] rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
                      >
                        {ucatSaveStatus === "saving" ? "Saving…" : ucatSaveStatus === "saved" ? "Saved" : ucatSaveStatus === "error" ? "Error" : "Save"}
                      </button>
                      {profile?.ucat_exam_date && (
                        <button
                          type="button"
                          onClick={() => setUcatEditing(false)}
                          className="min-h-[32px] rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {sessions.length === 0 && syllogismSessions.length === 0 && sjtSessions.length === 0 ? (
          <section className="mb-10">
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-slate-700 font-medium mb-4">
                No sessions yet. Pick any trainer from the home page to get started.
              </p>
              <Link
                to="/"
                  className="inline-flex min-h-[44px] items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Explore trainers
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Your typical WPM</p>
                  <p className="text-slate-500 text-xs mb-1">Average from your history</p>
                  <p className="text-3xl font-bold text-slate-900">{averageWpm}</p>
                  <StatDelta delta={wpmDelta.delta} direction={wpmDelta.direction} unit=" WPM" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Best WPM</p>
                  <p className="text-3xl font-bold text-slate-900">{bestWpm}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Best comprehension</p>
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
              {renderAccuracyChart(speedAccuracyChart, "Comprehension accuracy over time")}
              {renderDifficultyBreakdown(speedDifficultyBreakdown)}
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.rapid_recall}
              </h2>
              {rapidRecallSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500">No Rapid Recall sessions yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Average score</p>
                      <p className="text-2xl font-bold text-slate-900">{rapidRecallAvg}%</p>
                      <StatDelta delta={rapidAccDelta.delta} direction={rapidAccDelta.direction} unit="%" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best score</p>
                      <p className="text-2xl font-bold text-slate-900">{rapidBestScore}%</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Avg reading time</p>
                      <p className="text-2xl font-bold text-slate-900">{rapidAvgTime != null ? `${rapidAvgTime}s` : "-"}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best time</p>
                      <p className="text-2xl font-bold text-slate-900">{rapidBestTime != null ? `${rapidBestTime}s` : "-"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-4">
                    <span>{rapidRecallSessions.length} session{rapidRecallSessions.length !== 1 ? "s" : ""}</span>
                    {rapidLastSession && <span>Last session: {rapidLastSession}</span>}
                  </div>
                  {renderAccuracyChart(rapidAccuracyChart, "Recall accuracy over time")}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-4">
                    {renderDifficultyBreakdown(rapidDifficultyBreakdown)}
                  </div>
                </>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.keyword_scanning}
              </h2>
              {keywordSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500">No Keyword Scanning sessions yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Average accuracy</p>
                      <p className="text-2xl font-bold text-slate-900">{keywordAvg}%</p>
                      <StatDelta delta={keywordAccDelta.delta} direction={keywordAccDelta.direction} unit="%" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best accuracy</p>
                      <p className="text-2xl font-bold text-slate-900">{keywordBestAccuracy}%</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Avg scan time</p>
                      <p className="text-2xl font-bold text-slate-900">{averageScanTimeSeconds != null ? `${averageScanTimeSeconds}s` : "-"}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best time</p>
                      <p className="text-2xl font-bold text-slate-900">{keywordBestTime != null ? `${keywordBestTime}s` : "-"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-4">
                    <span>{keywordSessions.length} session{keywordSessions.length !== 1 ? "s" : ""}</span>
                    {keywordLastSession && <span>Last session: {keywordLastSession}</span>}
                  </div>
                  {renderAccuracyChart(keywordAccuracyChart, "Scanning accuracy over time")}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-4">
                    {renderDifficultyBreakdown(keywordDifficultyBreakdown)}
                  </div>
                </>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.inference_trainer}
              </h2>
              {inferenceSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500">No Inference Trainer sessions yet. Practice identifying evidence that supports inferences.</p>
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
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Average accuracy</p>
                      <p className="text-2xl font-bold text-slate-900">{inferenceAvg}%</p>
                      <StatDelta delta={inferenceAccDelta.delta} direction={inferenceAccDelta.direction} unit="%" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best accuracy</p>
                      <p className="text-2xl font-bold text-slate-900">{inferenceBestAccuracy}%</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Sessions</p>
                      <p className="text-2xl font-bold text-slate-900">{inferenceSessions.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Last session</p>
                      <p className="text-lg font-bold text-slate-900">{inferenceLastSession ?? "-"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-4">
                    <span>{inferenceSessions.length} session{inferenceSessions.length !== 1 ? "s" : ""}</span>
                    {inferenceLastSession && <span>Last: {inferenceLastSession}</span>}
                    <Link
                      to="/train/inference"
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Practice again →
                    </Link>
                  </div>
                  {renderAccuracyChart(inferenceAccuracyChart, "Accuracy over time")}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-4">
                    {renderDifficultyBreakdown(inferenceDifficultyBreakdown)}
                  </div>
                </>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.calculator}
              </h2>

              {calculatorSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500">No Calculator sessions yet. Start the Calculator Trainer to track your speed.</p>
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
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Your Average KPS</p>
                      <p className="text-3xl font-bold text-slate-900">{calculatorAvgKps}</p>
                      <StatDelta delta={calcKpsDelta.delta} direction={calcKpsDelta.direction} unit=" KPS" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Best KPS</p>
                      <p className="text-3xl font-bold text-slate-900">{calculatorBestKps}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Avg Accuracy</p>
                      <p className="text-3xl font-bold text-slate-900">{calculatorAvgAccuracy}%</p>
                    </div>
                  </div>

                  {/* Drill Breakdown */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">Performance by Mode</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(calculatorDrillBreakdown).map(([mode, stats]) => (
                        <div key={mode} className="bg-slate-50 p-3 rounded-lg text-center">
                          <p className="text-xs font-bold text-slate-600 uppercase mb-1">{mode === 'fingerTwister' ? 'Twister' : mode}</p>
                          <p className="text-lg font-bold text-slate-900">{stats.avgKps} <span className="text-xs font-normal text-slate-500">KPS</span></p>
                          <p className="text-xs text-slate-500">{stats.avgAccuracy}% Acc ({stats.count})</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-base font-medium text-slate-900 mb-4">
                      KPS Progress
                    </h3>
                    <div className="h-64 sm:h-72 min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={calculatorChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                            formatter={(value: number | undefined) => [`${value ?? 0} KPS`, "Speed"]}
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

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {TRAINING_TYPE_LABELS.mental_maths}
              </h2>
              {mentalMathsSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500">No Mental Maths sessions yet. Build speed and estimation without the calculator.</p>
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
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Avg accuracy</p>
                      <p className="text-3xl font-bold text-slate-900">{mentalMathsAvgAccuracy}%</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Avg time per question</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {mentalMathsAvgTimeMs != null ? `${(mentalMathsAvgTimeMs / 1000).toFixed(1)}s` : "-"}
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
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Sessions</p>
                      <p className="text-3xl font-bold text-slate-900">{mentalMathsSessions.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">Latest stage</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {mentalMathsSessions.length > 0 && mentalMathsSessions[mentalMathsSessions.length - 1]?.difficulty
                          ? String(mentalMathsSessions[mentalMathsSessions.length - 1].difficulty).replace("stage_", "Stage ")
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-base font-medium text-slate-900 mb-4">
                      Avg time per question (last 10 sessions)
                    </h3>
                    <div className="h-64 sm:h-72 min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mentalMathsChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                            formatter={(value: number | undefined) =>
                              [`${((value ?? 0) / 1000).toFixed(1)}s`, "Avg time"]
                            }
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

            <section className="mt-10">
              <WeekSummaryCard
                sessions={sessions}
                syllogismSessions={syllogismSessions}
                sjtSessions={sjtSessions}
              />
            </section>

            <section className="mt-10">
              <SyllogismAnalytics sessions={syllogismSessions} />
            </section>

            {recentActivity.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent activity</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table" aria-label="Recent training sessions">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Date & time</th>
                          <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Trainer</th>
                          <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                          <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                              {new Date(item.created_at).toLocaleString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-medium">
                              {item.label}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {item.timeDisplay}
                            </td>
                            <td className="px-4 py-3 text-slate-900">
                              {item.scoreDisplay}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
        </div>
        </div>
        <aside
          className="shrink-0 w-full lg:w-72 lg:sticky lg:top-6 lg:self-start space-y-4"
          aria-label="Optional courses and tutoring"
        >
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
          <p className="text-slate-600">Loading your dashboard…</p>
        </div>
      );
    }
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
        "flex flex-col bg-slate-50",
        inAppShell ? "flex-1 min-h-0" : "min-h-screen",
      )}
    >
      <SEOHead
        title="UCAT Verbal Reasoning Dashboard & Analytics"
        description="Track your reading speed (WPM) and accuracy for the UCAT medical entrance exam. Free trainer for UK medical students."
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
            <h1 className="text-2xl font-bold text-slate-900">
              {user ? "Dashboard" : "Your reading dashboard"}
            </h1>
            {!user && (
              <p className="text-sm text-slate-600 mt-1">
                Sign in to save progress and unlock your full analytics.
              </p>
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
