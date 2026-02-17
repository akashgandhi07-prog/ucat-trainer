import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { PASSAGES } from "../data/passages";
import type { Passage } from "../data/passages";
import { getTipForMode } from "../data/tips";
import { SKILL_TEACHING } from "../data/teaching";
import type { TrainingType, TrainingDifficulty } from "../types/training";
import { TRAINING_TYPE_LABELS, TRAINING_DIFFICULTY_LABELS } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { getWpmComparisonCopy } from "../lib/wpmBenchmark";
import { Zap, Brain, Search, Eye } from "lucide-react";
import {
  GUIDED_CHUNK_DEFAULT,
  GUIDED_CHUNK_MAX,
  GUIDED_CHUNK_MIN,
  clampChunkSize,
  loadGuidedChunkingPrefs,
  saveGuidedChunkingPrefs,
} from "../lib/guidedChunkingPreferences";

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

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
                How it works
              </p>
              <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
                {SKILL_TEACHING[mode].howToUse.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
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

              <div className="rounded-lg border border-slate-200 bg-amber-50/80 px-3 py-2 mb-1.5">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-0.5">
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
