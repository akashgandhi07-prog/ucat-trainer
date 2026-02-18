import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import { PASSAGES } from "../data/passages";
import type { Passage } from "../data/passages";
import { getTipForMode } from "../data/tips";
import type { TrainingType, TrainingDifficulty } from "../types/training";
import { TRAINING_TYPE_LABELS, TRAINING_DIFFICULTY_LABELS } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";
import { PASSAGE_IDS_WITH_INFERENCE } from "../data/inferenceQuestions";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { getWpmComparisonCopy, getWpmTier, getWpmTierLabel } from "../lib/wpmBenchmark";
import { Zap, Brain, Search, Eye, ChevronRight, Target } from "lucide-react";
import {
  GUIDED_CHUNK_DEFAULT,
  GUIDED_CHUNK_MAX,
  GUIDED_CHUNK_MIN,
  clampChunkSize,
  loadGuidedChunkingPrefs,
  saveGuidedChunkingPrefs,
} from "../lib/guidedChunkingPreferences";
import { getStreakAndLastPracticed } from "../lib/streakUtils";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import { trackEvent } from "../lib/analytics";

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
  speed_reading: "Expand your perifoveal vision. Focus on the centre of the text to process 5 words at once.",
  rapid_recall: "Build a conceptual map. Identify the author's stance before the timer hits zero.",
  keyword_scanning: "Train selective attention. Quickly isolate target keywords whilst filtering out noise.",
  calculator: "Build numpad fluency. Keep a consistent hand position and practise common operations until they're automatic.",
  inference_trainer: "Identify the precise evidence. Look for the sentence that directly supports the inference asked.",
  mental_maths: "Build automaticity with times tables and percentages; then practise estimation under time pressure.",
};

function getWpmStatusLabel(wpm: number): string {
  if (wpm <= 300) return "Reading for Detail";
  if (wpm <= 450) return "UCAT Competitive Range";
  return "Extreme Scanning";
}

function getWpmStatusColor(wpm: number): string {
  if (wpm <= 300) return "text-muted-foreground";
  if (wpm <= 450) return "text-training-success";
  return "text-primary";
}

/** Estimated score impact copy: difficulty-aware (speed_reading only has scale points). */
function getEstimatedScoreImpactCopy(
  mode: TrainingType,
  difficulty: TrainingDifficulty,
  wpm: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API consistency
  _lastSession: { correct: number; total: number; wpm: number | null } | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API consistency
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

const SKILLS: { type: TrainingType; icon: ReactNode; summary: string; benefit: string }[] = [
  {
    type: "speed_reading",
    icon: <Zap className="w-5 h-5" aria-hidden="true" />,
    summary: "Dial in your ideal reading speed for dense UCAT-style passages without losing comprehension.",
    benefit: "2× faster reading",
  },
  {
    type: "rapid_recall",
    icon: <Brain className="w-5 h-5" aria-hidden="true" />,
    summary: "Eliminate the need for re-reading with short, focused recall drills after each passage.",
    benefit: "No more re-reading",
  },
  {
    type: "keyword_scanning",
    icon: <Search className="w-5 h-5" aria-hidden="true" />,
    summary: "Train yourself to spot critical keywords and phrases quickly under time pressure.",
    benefit: "Find answers faster",
  },
  {
    type: "inference_trainer",
    icon: <Target className="w-5 h-5" aria-hidden="true" />,
    summary: "Identify the exact evidence that supports an inference by selecting text from the passage.",
    benefit: "Evidence-based answers",
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
  return s === "speed_reading" || s === "rapid_recall" || s === "keyword_scanning" || s === "inference_trainer";
}

function pickPassageForDifficulty(level: TrainingDifficulty): Passage {
  return pickNewRandomPassage(null, level);
}

export default function VerbalReasoningPage() {
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
    trackEvent("trainer_opened", {
      training_type: mode,
      pathname: window.location.pathname,
    });
  }, [mode]);

  useEffect(() => {
    const prefs = loadGuidedChunkingPrefs();
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount */
    setGuidedChunkingEnabled(prefs.enabled);
    setGuidedChunkSize(prefs.chunkSize);
  }, []);

  useEffect(() => {
    saveGuidedChunkingPrefs({ enabled: guidedChunkingEnabled, chunkSize: guidedChunkSize });
  }, [guidedChunkingEnabled, guidedChunkSize]);

  useEffect(() => {
    if (mode !== "speed_reading" || !user) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- clear when mode/user changes */
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
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- clear streak when logged out */
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
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- clear when logged out */
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
    trackEvent("trainer_started", {
      training_type: "speed_reading",
      difficulty,
      pathname: "/reader",
    });
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
    trackEvent("trainer_started", {
      training_type: "rapid_recall",
      difficulty,
      pathname: "/train/rapid-recall",
    });
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
    trackEvent("trainer_started", {
      training_type: "keyword_scanning",
      difficulty,
      pathname: "/train/keyword-scanning",
    });
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

  const handleStartInferenceTrainer = () => {
    trackEvent("trainer_started", {
      training_type: "inference_trainer",
      difficulty,
      pathname: "/train/inference",
    });
    const candidates = PASSAGES.filter((p) => PASSAGE_IDS_WITH_INFERENCE.includes(p.id));
    const chosenPassage = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : PASSAGES[0];
    if (!chosenPassage) return;
    navigate("/train/inference", {
      state: {
        trainingType: "inference_trainer" as const,
        passage: chosenPassage,
        difficulty,
      },
    });
  };

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-card text-foreground font-medium rounded-lg ring-2 ring-primary opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const location = useLocation();
  const canonicalUrl = getSiteBaseUrl() ? `${getSiteBaseUrl()}${location.pathname}` : undefined;
  const ogImageUrl = getSiteBaseUrl() ? `${getSiteBaseUrl()}/og-trainer.png` : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead
        title="UCAT Verbal Reasoning Trainer"
        description="Free speed reading, rapid recall and keyword scanning practice for the UCAT. Built by TheUKCATPeople for UK medical and dental applicants."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 pb-24 sm:pb-0" tabIndex={-1}>
        {/* Hero */}
        <header className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
            {displayName && (
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Welcome back, {displayName}.
              </p>
            )}
            {user && streakFetched && (streak > 0 || lastPracticedLabel != null) && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4 text-sm text-muted-foreground">
                {streak > 0 && (
                  <span className="font-medium text-training-success">{streak}-day streak</span>
                )}
                {lastPracticedLabel != null && (
                  <span>Last practiced {lastPracticedLabel.toLowerCase()}</span>
                )}
              </div>
            )}
            {user && streakFetched && streak === 0 && lastPracticedLabel == null && (
              <p className="text-sm text-muted-foreground text-center mb-4">
                Start a session to begin your streak.
              </p>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Master UCAT Verbal Reasoning.
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Free, evidence-based training to boost reading speed, recall, and accuracy — designed for UK medical &amp; dental applicants.
            </p>
            <div className="mt-4">
              <TutoringUpsell variant="hub" />
            </div>
          </div>
        </header>

        {/* Skill selector */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] text-center mb-6">
            Pick a skill to train
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map(({ type, icon, summary, benefit }) => {
              const isActive = mode === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMode(type)}
                  className={`group relative flex flex-col rounded-xl border p-5 text-left transition-all duration-200 ${isActive
                      ? "border-primary bg-training-active-muted shadow-md ring-1 ring-primary/20"
                      : "border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-md"
                    }`}
                >
                  <div className="flex flex-col gap-2 mb-3">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        }`}
                    >
                      {icon}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest leading-tight ${isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                    >
                      {benefit}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {TRAINING_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                  {isActive && (
                    <span className="absolute -bottom-px left-6 right-6 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Settings panel */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Session Settings
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-training-success" aria-hidden />
                  {TRAINING_TYPE_LABELS[mode]}
                </span>
              </div>

              <div className="mb-6 rounded-lg bg-training-highlight-muted border border-primary/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-1">
                  Objective
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {STRATEGIC_OBJECTIVES[mode]}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground mb-2">
                      Difficulty
                    </legend>
                    <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                      {(["easy", "medium", "hard"] as TrainingDifficulty[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${difficulty === level
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {TRAINING_DIFFICULTY_LABELS[level]}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {mode === "speed_reading" && (
                    <div className="space-y-5">
                      {(averageWpm != null || suggestedWpm != null) && (
                        <div className="rounded-xl border border-border bg-training-surface p-4 space-y-1">
                          {averageWpm != null && (
                            <p className="text-sm font-medium text-foreground">
                              Your typical speed: <strong>{averageWpm} WPM</strong>
                            </p>
                          )}
                          {suggestedWpm != null && (
                            <p className="text-sm text-muted-foreground">
                              Suggested next: <strong>{suggestedWpm} WPM</strong>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => setWpm(suggestedWpm)}
                                className="text-primary hover:underline"
                              >
                                Use suggested
                              </button>
                            </p>
                          )}
                          {averageWpm != null && (
                            <p className="text-xs text-muted-foreground">
                              {getWpmComparisonCopy(averageWpm)}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="rounded-xl border border-border bg-training-surface p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Words per minute
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Controls auto-scroll speed
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-bold tracking-tight text-foreground">
                              {wpm}
                            </span>
                            <span className="ml-1 text-xs font-medium text-muted-foreground">
                              WPM
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-8">{WPM_MIN}</span>
                          <input
                            type="range"
                            min={WPM_MIN}
                            max={WPM_MAX}
                            step={25}
                            value={wpm}
                            onChange={(e) => setWpm(Number(e.target.value))}
                            className="flex-1 h-2 rounded-full appearance-none bg-border accent-primary cursor-pointer"
                          />
                          <span className="text-xs text-muted-foreground w-8 text-right">{WPM_MAX}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs font-medium ${getWpmStatusColor(wpm)}`}>
                            {getWpmStatusLabel(wpm)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            ≈ {estimatedSeconds}s / passage
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-training-surface p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm border border-border">
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Guided Chunking
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Highlights word groups at your set pace
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={guidedChunkingEnabled}
                            onClick={() => setGuidedChunkingEnabled((prev) => !prev)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${guidedChunkingEnabled ? "bg-primary" : "bg-border"
                              }`}
                            aria-label="Toggle guided chunking"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow ring-0 transition-transform ${guidedChunkingEnabled ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                          </button>
                        </div>
                        {guidedChunkingEnabled && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Words per chunk
                            </p>
                            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                              {Array.from(
                                { length: GUIDED_CHUNK_MAX - GUIDED_CHUNK_MIN + 1 },
                                (_, i) => GUIDED_CHUNK_MIN + i
                              ).map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => setGuidedChunkSize(clampChunkSize(size))}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${guidedChunkSize === size
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === "rapid_recall" && (
                    <fieldset>
                      <legend className="text-sm font-medium text-foreground mb-2">
                        Time to read
                      </legend>
                      <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                        {TIME_PRESETS.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setTimeLimitSeconds(sec)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${timeLimitSeconds === sec
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {mode === "keyword_scanning" && (
                    <fieldset>
                      <legend className="text-sm font-medium text-foreground mb-2">
                        Keywords to find
                      </legend>
                      <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                        {KEYWORD_COUNTS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setKeywordCount(n)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${keywordCount === n
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {mode === "inference_trainer" && (
                    <p className="text-sm text-muted-foreground">
                      Select the relevant section(s) of text for each question. Questions are drawn from passages with curated inference tasks.
                    </p>
                  )}

                  <div className="rounded-lg bg-card border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Tip
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {getTipForMode(mode, new Date().getDate())}
                    </p>
                  </div>

                  <div className="hidden sm:block pt-2">
                    <button
                      type="button"
                      onClick={
                        mode === "speed_reading"
                          ? handleStartSpeedReading
                          : mode === "rapid_recall"
                            ? handleStartRapidRecall
                            : mode === "keyword_scanning"
                              ? handleStartKeywordScanning
                              : handleStartInferenceTrainer
                      }
                      className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      Start training
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Session Stats */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border border-border bg-training-surface p-5 space-y-5 lg:sticky lg:top-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                      Live Session Stats
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {TRAINING_DIFFICULTY_LABELS[difficulty]} difficulty
                    </p>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Estimated Score Impact
                      </p>
                      <p className="text-lg font-bold text-foreground">
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
                      <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-muted-foreground">Calibration</span>
                        <span className="text-foreground">
                          {getCalibrationLabel(mode, difficulty, wpm, sessionCountAtDifficulty)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-training-success to-primary transition-all duration-500 ease-out"
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
                      <p className="text-sm text-foreground leading-snug">{progressNarrative}</p>
                    )}
                    {(lastSessionAtDifficulty != null || sessionCountAtDifficulty > 0) && (
                      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                          Your history at this difficulty
                        </p>
                        {lastSessionAtDifficulty != null && lastSessionAtDifficulty.total > 0 && (
                          <p className="text-sm text-foreground">
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
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sessionCountAtDifficulty} session{sessionCountAtDifficulty !== 1 ? "s" : ""} · {avgAccuracyAtDifficulty}% avg accuracy
                          </p>
                        )}
                      </div>
                    )}
                    {mode === "speed_reading" && (
                      <div className="rounded-lg bg-card border border-border p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Tip
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          Try reading at {wpm + 50} WPM for one session, then drop back. Your &quot;comfortable&quot; speed often rises.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-t border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <h2 className="text-xs font-bold tracking-[0.2em] text-primary uppercase text-center">
              Built for Students, by Professionals
            </h2>
            <p className="mt-3 text-sm text-muted-foreground text-center max-w-2xl mx-auto">
              Designed with UK medical and dental applicants in mind, using the same evidence base we teach on admissions courses.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  stat: "10,000+",
                  label: "Students Helped",
                  desc: "Over 13 years supporting medical &amp; dental applicants.",
                },
                {
                  stat: "Evidence",
                  label: "Based Methods",
                  desc: "Built on speed-reading and retrieval-practice science.",
                },
                {
                  stat: "UCAT",
                  label: "Focused Content",
                  desc: "Tailored for verbal reasoning exam success.",
                },
              ].map(({ stat, label, desc }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-training-surface p-5"
                >
                  <p className="text-2xl font-bold text-foreground">{stat}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {label}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Sticky mobile CTA */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        <button
          type="button"
          onClick={
            mode === "speed_reading"
              ? handleStartSpeedReading
              : mode === "rapid_recall"
                ? handleStartRapidRecall
                : mode === "keyword_scanning"
                  ? handleStartKeywordScanning
                  : handleStartInferenceTrainer
          }
          className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start training
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <Footer />
    </div>
  );
}
