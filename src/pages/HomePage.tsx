import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { PASSAGES } from "../data/passages";
import type { Passage } from "../data/passages";
import { SKILL_TEACHING, WHY_UCAT_READING } from "../data/teaching";
import { getTipForMode } from "../data/tips";
import type { TrainingType } from "../types/training";
import { TRAINING_TYPE_LABELS } from "../types/training";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { getWpmComparisonCopy } from "../lib/wpmBenchmark";

const WPM_MIN = 200;
const WPM_MAX = 600;
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

const SKILLS: { type: TrainingType; icon: string }[] = [
  { type: "speed_reading", icon: "📖" },
  { type: "rapid_recall", icon: "🧠" },
  { type: "keyword_scanning", icon: "🔍" },
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
  const [questionCount] = useState(7);
  const [suggestedWpm, setSuggestedWpm] = useState<number | null>(null);
  const [averageWpm, setAverageWpm] = useState<number | null>(null);

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
    const chosenPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
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
      },
    });
  };

  const handleStartRapidRecall = () => {
    const chosenPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    navigate("/train/rapid-recall", {
      state: {
        trainingType: "rapid_recall" as const,
        passage: chosenPassage,
        timeLimitSeconds,
      },
    });
  };

  const handleStartKeywordScanning = () => {
    const chosenPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    navigate("/train/keyword-scanning", {
      state: {
        trainingType: "keyword_scanning" as const,
        passage: chosenPassage,
        keywordCount,
      },
    });
  };

  const teaching = SKILL_TEACHING[mode];

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <section className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            {displayName ? (
              <>Welcome back, {displayName}</>
            ) : (
              "UCAT-style reading practice"
            )}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            {displayName ? "Pick a skill and keep building your speed." : WHY_UCAT_READING}
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left: Skill cards */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 text-center lg:text-left">
                Pick a skill
              </p>
              <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto pb-1 lg:pb-0 lg:overflow-visible">
                {SKILLS.map(({ type, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMode(type)}
                    className={`flex items-center gap-3 p-4 rounded-xl border min-w-[200px] lg:min-w-0 w-full text-left transition-all ${
                      mode === type
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl leading-none"
                      aria-hidden
                    >
                      {icon}
                    </span>
                    <span
                      className={`font-semibold text-base leading-tight ${
                        mode === type ? "text-blue-700" : "text-slate-900"
                      }`}
                    >
                      {TRAINING_TYPE_LABELS[type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Teaching + Config */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
                {/* Teaching */}
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-slate-500">Why this skill</h2>
                  <p className="text-slate-700 text-sm">{teaching.why}</p>
                  <h2 className="text-sm font-medium text-slate-500 pt-1">How to use</h2>
                  <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                    {teaching.howToUse.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <hr className="border-slate-200" />

                {/* Config */}
                <div className="space-y-4">
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-slate-700">
                            Words per minute
                          </label>
                          <span className="font-bold text-slate-900">{wpm} WPM</span>
                        </div>
                        <input
                          type="range"
                          min={WPM_MIN}
                          max={WPM_MAX}
                          step={25}
                          value={wpm}
                          onChange={(e) => setWpm(Number(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-blue-600"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Estimated: {estimatedSeconds}s
                        </p>
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

                  <div className="rounded-lg border border-slate-200 bg-amber-50/80 px-3 py-2 mb-3">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-0.5">
                      Tip
                    </p>
                    <p className="text-sm text-slate-700">
                      {getTipForMode(mode, new Date().getDate())}
                    </p>
                  </div>

                  <div className="pt-2">
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
            </div>
          </div>
        </section>

        {/* Compact "How it works" */}
        <section className="max-w-5xl mx-auto px-4 pb-10">
          <details className="bg-slate-50 rounded-lg border border-slate-200 p-3">
            <summary className="min-h-[44px] flex items-center text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
              How it works
            </summary>
            <ol className="mt-2 text-slate-600 text-sm space-y-1 list-decimal list-inside">
              <li>Read a passage at your chosen speed or time limit.</li>
              <li>Answer questions or find target words.</li>
              <li>Save progress and track WPM on your <Link to="/dashboard" className="text-blue-600 hover:underline">dashboard</Link>.</li>
            </ol>
          </details>
        </section>
      </main>
      <Footer />
    </div>
  );
}
