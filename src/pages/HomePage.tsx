import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { PASSAGES } from "../data/passages";
import type { Passage } from "../data/passages";
import { getTipForMode } from "../data/tips";
import type { TrainingType, TrainingDifficulty } from "../types/training";
import { TRAINING_TYPE_LABELS, TRAINING_DIFFICULTY_LABELS } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { getWpmComparisonCopy, getWpmTier, getWpmTierLabel } from "../lib/wpmBenchmark";
import { Zap, Brain, Search, Eye } from "lucide-react";
import {
  GUIDED_CHUNK_DEFAULT,
  GUIDED_CHUNK_MAX,
  GUIDED_CHUNK_MIN,
  clampChunkSize,
  loadGuidedChunkingPrefs,
  saveGuidedChunkingPrefs,
} from "../lib/guidedChunkingPreferences";
import { getStreakAndLastPracticed } from "../lib/streakUtils";

const WPM_MIN = 200;
const WPM_MAX = 900;
const WPM_STORAGE_KEY = "ukcat-reader-wpm";
const TIME_PRESETS = [30, 60, 90, 120] as const;
const KEYWORD_COUNTS = [5, 6, 7, 8] as const;

const WPM_RATING_DELTAS: Record<string, number> = {
  too_slow: 25,
  slightly_slow: 15,
  just_right: 0,
  slightly_fast: -15,
  too_fast: -25,
};

const STRATEGIC_OBJECTIVES: Record<TrainingType, string> = {
  speed_reading: "Objective: Expand your perifoveal vision. Focus on the centre of the text to process 5 words at once.",
  rapid_recall: "Objective: Build a conceptual map. Identify the author's stance before the timer hits zero.",
  keyword_scanning: "Objective: Train selective attention. Quickly isolate target keywords whilst filtering out noise.",
};

function getWpmStatusLabel(wpm: number): string {
  if (wpm <= 300) return "Reading for Detail (Low Speed)";
  if (wpm <= 450) return "UCAT Competitive Range (Optimal)";
  return "Extreme Scanning (Skimming Only)";
}

/** Estimated score impact copy: difficulty-aware (speed_reading only has scale points). */
function getEstimatedScoreImpactCopy(
  mode: TrainingType,
  difficulty: TrainingDifficulty,
  wpm: number,
  _lastSession: { correct: number; total: number; wpm: number | null } | null,
  _sessionCount: number
): string {
  if (mode !== "speed_reading") {
    return "Complete sessions to estimate";
  }
  const wpmTier = wpm > 400 ? "high" : wpm >= 301 ? "mid" : "low";
  if (difficulty === "easy") {
    if (wpmTier === "high") return "+10 Scale points (Easier · building speed)";
    if (wpmTier === "mid") return "+8 Scale points (Easier · practice)";
    return "+5 Scale points (Easier · building)";
  }
  if (difficulty === "hard") {
    if (wpmTier === "high") return "+20 Scale points (Challenging)";
    if (wpmTier === "mid") return "+15 Scale points (Challenging)";
    return "+8 Scale points (Challenging · building)";
  }
  if (wpmTier === "high") return "+20 Scale points (Standard)";
  if (wpmTier === "mid") return "+15 Scale points (Standard)";
  return "+5 Scale points (Standard · building)";
}

/** Calibration label: difficulty-aware; references history when we have it. */
function getCalibrationLabel(
  mode: TrainingType,
  difficulty: TrainingDifficulty,
  wpm: number,
  sessionCount: number
): string {
  if (mode !== "speed_reading") {
    if (sessionCount > 0) return `${sessionCount} session${sessionCount !== 1 ? "s" : ""} at this difficulty`;
    return "—";
  }
  if (wpm >= 301 && wpm <= 450) {
    const suffix = sessionCount > 0 ? ` · ${sessionCount} run${sessionCount !== 1 ? "s" : ""} at ${TRAINING_DIFFICULTY_LABELS[difficulty]}` : "";
    return `Exam Ready${suffix}`;
  }
  if (wpm > 450) {
    const suffix = sessionCount > 0 ? ` · ${sessionCount} at ${TRAINING_DIFFICULTY_LABELS[difficulty]}` : "";
    return `Peak Speed${suffix}`;
  }
  const pct = Math.min(99, Math.round(((wpm - 200) / 101) * 100));
  return `${pct}%`;
}

const WPM_GOAL = 400;

/** Progress narrative for Live Session Stats: "X% of the way to 400 WPM" or milestone for other modes. */
function getProgressNarrativeCopy(
  mode: TrainingType,
  wpm: number,
  sessionCountAtDifficulty: number
): string | null {
  if (mode === "speed_reading") {
    const tier = getWpmTier(wpm);
    const tierLabel = getWpmTierLabel(tier);
    if (wpm >= WPM_GOAL) {
      return `${tierLabel}. You're at ${WPM_GOAL}+ WPM.`;
    }
    const pct = Math.min(99, Math.max(0, Math.round(((wpm - 200) / (WPM_GOAL - 200)) * 100)));
    return `${tierLabel}. ${pct}% of the way to ${WPM_GOAL} WPM.`;
  }
  if (sessionCountAtDifficulty < 3) {
    const remaining = 3 - sessionCountAtDifficulty;
    return `${remaining} more session${remaining !== 1 ? "s" : ""} at this difficulty to build confidence.`;
  }
  return null;
}

const SKILLS: { type: TrainingType; icon: ReactNode; summary: string }[] = [
  {
    type: "speed_reading",
    icon: <Zap className="w-5 h-5" aria-hidden="true" />,
    summary: "Dial in your ideal reading speed for dense UCAT-style passages without losing comprehension.",
  },
  {
    type: "rapid_recall",
    icon: <Brain className="w-5 h-5" aria-hidden="true" />,
    summary: "Eliminate the need for re-reading with short, focused recall drills after each passage.",
  },
  {
    type: "keyword_scanning",
    icon: <Search className="w-5 h-5" aria-hidden="true" />,
    summary: "Train yourself to spot critical keywords and phrases quickly under time pressure.",
  },
];

function getStoredWpm(): number {
  if (typeof window === "undefined") return 300;
  const stored = localStorage.getItem(WPM_STORAGE_KEY);
  if (stored == null) return 300;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed)
    ? Math.min(WPM_MAX, Math.max(WPM_MIN, parsed))
    : 300;
}

function wordCount(p: Passage): number {
  return p.text.trim().split(/\s+/).length;
}

function isValidTrainingType(s: string | null): s is TrainingType {
  return s === "speed_reading" || s === "rapid_recall" || s === "keyword_scanning";
}

function pickPassageForDifficulty(level: TrainingDifficulty): Passage {
  return pickNewRandomPassage(null, level);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get("mode");
  const mode: TrainingType = isValidTrainingType(rawMode) ? rawMode : "speed_reading";
  const { user, profile } = useAuth();
  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    null;

  const [wpm, setWpm] = useState(getStoredWpm);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(60);
  const [keywordCount, setKeywordCount] = useState(6);
  const [questionCount] = useState(3);
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>("medium");
  const [suggestedWpm, setSuggestedWpm] = useState<number | null>(null);
  const [averageWpm, setAverageWpm] = useState<number | null>(null);
  const [guidedChunkingEnabled, setGuidedChunkingEnabled] = useState(false);
  const [guidedChunkSize, setGuidedChunkSize] = useState(GUIDED_CHUNK_DEFAULT);
  /** Session history for current mode + difficulty (for Live Session Stats). */
  const [lastSessionAtDifficulty, setLastSessionAtDifficulty] = useState<{
    wpm: number | null;
    correct: number;
    total: number;
    time_seconds: number | null;
  } | null>(null);
  const [sessionCountAtDifficulty, setSessionCountAtDifficulty] = useState(0);
  const [avgAccuracyAtDifficulty, setAvgAccuracyAtDifficulty] = useState<number | null>(null);
  /** Streak and last practiced (for logged-in users). */
  const [streak, setStreak] = useState(0);
  const [lastPracticedLabel, setLastPracticedLabel] = useState<string | null>(null);
  const [streakFetched, setStreakFetched] = useState(false);

  const avgWordsSpeedReading = useMemo(
    () => Math.round(PASSAGES.reduce((s, p) => s + wordCount(p), 0) / PASSAGES.length),
    []
  );
  const words = avgWordsSpeedReading;
  const estimatedSeconds = useMemo(
    () => Math.ceil((words / wpm) * 60),
    [words, wpm]
  );

  useEffect(() => {
    const prefs = loadGuidedChunkingPrefs();
    setGuidedChunkingEnabled(prefs.enabled);
    setGuidedChunkSize(prefs.chunkSize);
  }, []);

  useEffect(() => {
    saveGuidedChunkingPrefs({ enabled: guidedChunkingEnabled, chunkSize: guidedChunkSize });
  }, [guidedChunkingEnabled, guidedChunkSize]);

  useEffect(() => {
    if (mode !== "speed_reading" || !user) {
      setSuggestedWpm(null);
      setAverageWpm(null);
      return;
    }
    const fetchSpeedReadingStats = async () => {
      const { data: lastRow, error: lastError } = await supabase
        .from("sessions")
        .select("wpm, wpm_rating")
        .eq("user_id", user.id)
        .eq("training_type", "speed_reading")
        .not("wpm", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) {
        supabaseLog.warn("Suggested WPM fetch failed", { message: lastError.message, code: lastError.code });
        setSuggestedWpm(null);
      } else if (lastRow?.wpm != null) {
        const delta = lastRow.wpm_rating != null ? WPM_RATING_DELTAS[String(lastRow.wpm_rating)] ?? 0 : 0;
        const suggested = Math.round(lastRow.wpm + delta);
        setSuggestedWpm(Math.min(WPM_MAX, Math.max(WPM_MIN, suggested)));
      } else {
        setSuggestedWpm(null);
      }

      const { data: allRows, error: allError } = await supabase
        .from("sessions")
        .select("wpm")
        .eq("user_id", user.id)
        .eq("training_type", "speed_reading")
        .not("wpm", "is", null);
      if (allError) {
        supabaseLog.warn("Average WPM fetch failed", { message: allError.message, code: allError.code });
        setAverageWpm(null);
      } else if (allRows?.length) {
        const sum = allRows.reduce((s, r) => s + (r.wpm ?? 0), 0);
        setAverageWpm(Math.round(sum / allRows.length));
      } else {
        setAverageWpm(null);
      }
    };
    fetchSpeedReadingStats();
  }, [mode, user]);

  useEffect(() => {
    if (!user) {
      setStreak(0);
      setLastPracticedLabel(null);
      setStreakFetched(false);
      return;
    }
    let cancelled = false;
    const fetchStreak = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        supabaseLog.warn("Streak fetch failed", { message: error.message, code: error.code });
        setStreak(0);
        setLastPracticedLabel(null);
        setStreakFetched(true);
        return;
      }
      const rows = (data ?? []) as { created_at: string }[];
      const { streak: s, lastPracticedLabel: l } = getStreakAndLastPracticed(rows);
      setStreak(s);
      setLastPracticedLabel(l);
      setStreakFetched(true);
    };
    fetchStreak();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLastSessionAtDifficulty(null);
      setSessionCountAtDifficulty(0);
      setAvgAccuracyAtDifficulty(null);
      return;
    }
    const fetchSessionStatsAtDifficulty = async () => {
      const { data: lastRow, error: lastError } = await supabase
        .from("sessions")
        .select("wpm, correct, total, time_seconds")
        .eq("user_id", user.id)
        .eq("training_type", mode)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) {
        supabaseLog.warn("Last session at difficulty fetch failed", {
          message: lastError.message,
          code: lastError.code,
        });
        setLastSessionAtDifficulty(null);
      } else if (lastRow) {
        setLastSessionAtDifficulty({
          wpm: lastRow.wpm ?? null,
          correct: lastRow.correct ?? 0,
          total: lastRow.total ?? 0,
          time_seconds: lastRow.time_seconds ?? null,
        });
      } else {
        setLastSessionAtDifficulty(null);
      }

      const { data: rows, error: listError } = await supabase
        .from("sessions")
        .select("correct, total")
        .eq("user_id", user.id)
        .eq("training_type", mode)
        .eq("difficulty", difficulty);
      if (listError) {
        setSessionCountAtDifficulty(0);
        setAvgAccuracyAtDifficulty(null);
        return;
      }
      if (rows?.length) {
        setSessionCountAtDifficulty(rows.length);
        const totalCorrect = rows.reduce((s, r) => s + (r.correct ?? 0), 0);
        const totalQuestions = rows.reduce((s, r) => s + (r.total ?? 0), 0);
        setAvgAccuracyAtDifficulty(
          totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null
        );
      } else {
        setSessionCountAtDifficulty(0);
        setAvgAccuracyAtDifficulty(null);
      }
    };
    fetchSessionStatsAtDifficulty();
  }, [user, mode, difficulty]);

  const progressNarrative = useMemo(
    () => getProgressNarrativeCopy(mode, wpm, sessionCountAtDifficulty),
    [mode, wpm, sessionCountAtDifficulty]
  );

  const setMode = (m: TrainingType) => {
    setSearchParams({ mode: m });
  };

  const handleStartSpeedReading = () => {
    const chosenPassage = pickPassageForDifficulty(difficulty);
    try {
      localStorage.setItem(WPM_STORAGE_KEY, String(wpm));
    } catch {
      // ignore
    }
    navigate("/reader", {
      state: {
        trainingType: "speed_reading" as const,
        passageId: chosenPassage.id,
        passage: chosenPassage,
        wpm,
        questionCount,
        difficulty,
        guidedChunkingEnabled,
        guidedChunkSize,
      },
    });
  };

  const handleStartRapidRecall = () => {
    const chosenPassage = pickPassageForDifficulty(difficulty);
    navigate("/train/rapid-recall", {
      state: {
        trainingType: "rapid_recall" as const,
        passage: chosenPassage,
        timeLimitSeconds,
        difficulty,
      },
    });
  };

  const handleStartKeywordScanning = () => {
    const chosenPassage = pickPassageForDifficulty(difficulty);
    navigate("/train/keyword-scanning", {
      state: {
        trainingType: "keyword_scanning" as const,
        passage: chosenPassage,
        keywordCount,
        difficulty,
      },
    });
  };

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main
        id="main-content"
        className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100"
        tabIndex={-1}
      >
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-8 sm:pt-10 sm:pb-10">
          {displayName && (
            <p className="text-sm font-medium text-slate-600 text-center mb-3">
              Welcome back, {displayName}.
            </p>
          )}
          {user && streakFetched && (streak > 0 || lastPracticedLabel != null) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4 text-sm text-slate-600">
              {streak > 0 && (
                <span className="font-medium text-green-700">{streak}-day streak</span>
              )}
              {lastPracticedLabel != null && (
                <span>Last practiced {lastPracticedLabel.toLowerCase()}</span>
              )}
            </div>
          )}
          {user && streakFetched && streak === 0 && lastPracticedLabel == null && (
            <p className="text-sm text-slate-500 text-center mb-4">
              Start a session to begin your streak.
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 text-center">
            Master the UCAT Verbal Reasoning.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-3xl mx-auto text-center">
            Free UCAT reading practice to boost speed, recall, and accuracy. Create a free account to save and sync
            your progress.
          </p>
        </section>

        {/* Skill selection */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] text-center">
            Pick a skill to train
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3 items-stretch">
            {SKILLS.map(({ type, icon, summary }) => {
              const isActive = mode === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMode(type)}
                  className={`flex flex-col items-center rounded-2xl border bg-white p-5 sm:p-6 text-center transition-transform transition-shadow duration-150 ${
                    isActive
                      ? "border-emerald-400 bg-emerald-50/80 shadow-lg ring-1 ring-emerald-100 hover:-translate-y-0.5 hover:shadow-xl"
                      : "border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
                  }`}
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-white text-emerald-600 shadow-sm" : "bg-slate-100 text-slate-700"
                    }`}
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <p className="mt-3 min-h-[1.75rem] text-base sm:text-lg font-semibold tracking-tight text-slate-900 flex items-center justify-center">
                    {TRAINING_TYPE_LABELS[type]}
                  </p>
                  <p
                    className={`mt-1 min-h-[1rem] text-[11px] font-semibold uppercase tracking-[0.16em] flex items-center justify-center ${
                      isActive ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    UCAT skill focus
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{summary}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Settings */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Settings
                </h2>
              </div>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                <span className="text-xs font-medium text-slate-700">
                  {TRAINING_TYPE_LABELS[mode]}
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
                Strategic Objective
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {STRATEGIC_OBJECTIVES[mode]}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["easy", "medium", "hard"] as TrainingDifficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        difficulty === level
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {TRAINING_DIFFICULTY_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "speed_reading" && (
                <>
                  {(averageWpm != null || suggestedWpm != null) && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                      {averageWpm != null && (
                        <p className="text-sm font-medium text-slate-800">
                          Your typical speed: <strong>{averageWpm} WPM</strong>
                        </p>
                      )}
                      {suggestedWpm != null && (
                        <p className="text-sm text-slate-600">
                          Suggested next: <strong>{suggestedWpm} WPM</strong>
                          {" · "}
                          <button
                            type="button"
                            onClick={() => setWpm(suggestedWpm)}
                            className="text-blue-600 hover:underline"
                          >
                            Use suggested
                          </button>
                        </p>
                      )}
                      {averageWpm != null && (
                        <p className="text-xs text-slate-500">
                          {getWpmComparisonCopy(averageWpm)}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Words per minute
                        </label>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Controls how fast the passage auto-scrolls.
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-2xl font-semibold tracking-tight text-slate-900">
                          {wpm}
                        </span>
                        <span className="text-xs font-medium text-slate-500">WPM</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={WPM_MIN}
                        max={WPM_MAX}
                        step={25}
                        value={wpm}
                        onChange={(e) => setWpm(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-blue-600"
                      />
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                        ≈ {estimatedSeconds}s / passage
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      {getWpmStatusLabel(wpm)}
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Guided Chunking
                            </p>
                            <p className="text-xs text-slate-500">
                              Highlights word groups at your set pace. Helpful for focus and scanning; you can turn this off any time.
                            </p>
                            {guidedChunkingEnabled && (
                              <div className="mt-2">
                                <p className="text-[11px] font-medium text-slate-600 mb-1">
                                  Words per chunk
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(
                                    { length: GUIDED_CHUNK_MAX - GUIDED_CHUNK_MIN + 1 },
                                    (_, i) => GUIDED_CHUNK_MIN + i
                                  ).map((size) => (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() => setGuidedChunkSize(clampChunkSize(size))}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                        guidedChunkSize === size
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                      }`}
                                    >
                                      {size} word{size !== 1 ? "s" : ""}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={guidedChunkingEnabled}
                          onClick={() => setGuidedChunkingEnabled((prev) => !prev)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            guidedChunkingEnabled ? "bg-slate-900" : "bg-slate-200"
                          }`}
                          aria-label="Toggle guided chunking"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              guidedChunkingEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {mode === "rapid_recall" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Time to read
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTimeLimitSeconds(sec)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          timeLimitSeconds === sec
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "keyword_scanning" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Keywords to find
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {KEYWORD_COUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setKeywordCount(n)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          keywordCount === n
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 border-l-4 border-l-indigo-500 px-4 py-3 mb-1.5" style={{ backgroundColor: "#f8fafc" }}>
                <p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-0.5">
                  Tip
                </p>
                <p className="text-sm text-slate-700">
                  {getTipForMode(mode, new Date().getDate())}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={
                    mode === "speed_reading"
                      ? handleStartSpeedReading
                      : mode === "rapid_recall"
                        ? handleStartRapidRecall
                        : handleStartKeywordScanning
                  }
                  className="w-full min-h-[44px] px-4 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Start training
                </button>
              </div>
              </div>

              {/* Live Session Stats */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4 sticky top-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-[0.12em]">
                      Live Session Stats
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {TRAINING_DIFFICULTY_LABELS[difficulty]} difficulty
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Estimated Score Impact</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {getEstimatedScoreImpactCopy(
                        mode,
                        difficulty,
                        wpm,
                        lastSessionAtDifficulty,
                        sessionCountAtDifficulty
                      )}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                      <span>Calibration Status</span>
                      <span>
                        {getCalibrationLabel(mode, difficulty, wpm, sessionCountAtDifficulty)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                        style={{
                          width:
                            mode === "speed_reading"
                              ? `${Math.min(100, Math.max(0, wpm >= 301 ? 100 : ((wpm - 200) / 101) * 100))}%`
                              : sessionCountAtDifficulty > 0 && avgAccuracyAtDifficulty != null
                                ? `${avgAccuracyAtDifficulty}%`
                                : "0%",
                        }}
                      />
                    </div>
                  </div>
                  {progressNarrative != null && (
                    <p className="text-sm text-slate-700 leading-snug">{progressNarrative}</p>
                  )}
                  {(lastSessionAtDifficulty != null || sessionCountAtDifficulty > 0) && (
                    <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                        Your history at this difficulty
                      </p>
                      {lastSessionAtDifficulty != null && lastSessionAtDifficulty.total > 0 && (
                        <p className="text-sm text-slate-700">
                          Last run: {lastSessionAtDifficulty.correct}/{lastSessionAtDifficulty.total} correct
                          {mode === "speed_reading" && lastSessionAtDifficulty.wpm != null && (
                            <> · {lastSessionAtDifficulty.wpm} WPM</>
                          )}
                          {mode === "keyword_scanning" &&
                            lastSessionAtDifficulty.time_seconds != null && (
                              <> · {lastSessionAtDifficulty.time_seconds}s</>
                            )}
                        </p>
                      )}
                      {sessionCountAtDifficulty > 0 && avgAccuracyAtDifficulty != null && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          {sessionCountAtDifficulty} session{sessionCountAtDifficulty !== 1 ? "s" : ""} · {avgAccuracyAtDifficulty}% avg accuracy
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof / mission bar */}
        <section className="border-t border-slate-200 bg-white/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-blue-600 uppercase text-center">
              Built for Students, by Professionals
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 text-center max-w-2xl mx-auto">
              Designed with UK medical and dental applicants in mind, using the same evidence base we teach on
              admissions courses.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  10,000+ Students Helped
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Over 13 years supporting International and UK medical &amp; dental applicants.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Evidence-Based.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Built on speed-reading and retrieval-practice science.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Med &amp; Dent Focused.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Content tailored for UCAT verbal reasoning success.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
