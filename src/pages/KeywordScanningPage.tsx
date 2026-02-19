import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import type { Passage } from "../data/passages";
import { PASSAGES } from "../data/passages";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

type Phase = "scanning" | "results";

type LocationState = {
  trainingType: "keyword_scanning";
  passage: Passage;
  keywordCount: number;
  difficulty?: TrainingDifficulty;
};

const STOPWORDS = new Set([
  "and", "but", "the", "they", "are", "for", "has", "can", "its", "not", "was", "were", "been",
  "have", "had", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "need", "dare", "ought", "used", "that", "this", "with", "from", "than", "then", "when", "what",
  "which", "who", "how", "all", "any", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "than", "too", "very", "just", "also", "into", "through",
  "during", "before", "after", "above", "below", "between", "under", "again", "further", "once",
  "here", "there", "where", "why", "because", "while", "whereas", "although", "though", "however",
]);

function pickTargetWords(text: string, count: number): string[] {
  const words = text.trim().split(/\s+/).map((w) => w.toLowerCase().replace(/[^\w]/g, ""));
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length < 4 || STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const candidates = [...freq.entries()]
    .filter(([, c]) => c <= 2)
    .map(([w]) => w)
    .slice(0, count * 4);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of shuffled) {
    if (out.length >= count) break;
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  while (out.length < count && candidates.length > 0) {
    const w = candidates[out.length % candidates.length];
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    } else {
      break;
    }
  }
  return out.slice(0, count);
}

export default function KeywordScanningPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const keywordCount = state?.keywordCount ?? 6;
  const difficulty: TrainingDifficulty = state?.difficulty ?? "medium";

  const [phase, setPhase] = useState<Phase>("scanning");
  const [passage, setPassage] = useState<Passage | null>(
    () => state?.passage ?? PASSAGES[0] ?? null
  );
  const [startTime, setStartTime] = useState(() => Date.now());
  const [foundCount, setFoundCount] = useState(0);
  const [clickedWrong, setClickedWrong] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bestTimeSeconds, setBestTimeSeconds] = useState<number | null>(null);
  const [resultsElapsedSeconds, setResultsElapsedSeconds] = useState<number | null>(null);
  const hasAutoSavedRef = useRef(false);
  const mountedRef = useRef(true);
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "scanning") {
      trackEvent("trainer_started", {
        training_type: "keyword_scanning",
        difficulty,
        keyword_count: keywordCount,
      });
      setActiveTrainer("keyword_scanning", "scanning");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
  }, [phase, difficulty, keywordCount]);

  useEffect(() => {
    if (phase !== "results" || !user || keywordCount <= 0) return;
    const fetchBest = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("time_seconds")
        .eq("user_id", user.id)
        .eq("training_type", "keyword_scanning")
        .eq("total", keywordCount)
        .not("time_seconds", "is", null)
        .order("time_seconds", { ascending: true })
        .limit(1)
        .maybeSingle();
      const t = data?.time_seconds;
      setBestTimeSeconds(typeof t === "number" ? t : null);
    };
    fetchBest();
  }, [phase, user, keywordCount]);

  const targets = useMemo(
    () => (passage ? pickTargetWords(passage.text, keywordCount) : []),
    [passage, keywordCount]
  );
  const targetSet = useMemo(() => new Set(targets.map((t) => t.toLowerCase())), [targets]);
  const [foundSet, setFoundSet] = useState<Set<string>>(() => new Set());

  const paragraphs = useMemo(() => {
    if (!passage) return [];
    return passage.text
      .trim()
      .split(/\n\n+/)
      .map((p) => p.trim().split(/\s+/).filter(Boolean))
      .filter((p) => p.length > 0);
  }, [passage]);

  const handleWordClick = useCallback(
    (normalized: string) => {
      if (foundSet.has(normalized)) return;
      if (targetSet.has(normalized)) {
        setFoundSet((prev) => new Set(prev).add(normalized));
        setFoundCount((c) => c + 1);
      } else {
        setClickedWrong(true);
        setTimeout(() => setClickedWrong(false), 300);
      }
    },
    [targetSet, foundSet]
  );

  useEffect(() => {
    if (foundCount >= targets.length && targets.length > 0) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- transition to results with elapsed time */
      setResultsElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
      setPhase("results");
    }
  }, [foundCount, targets.length, startTime]);

  const handleSaveProgress = useCallback(
    async (opts?: { skipRestart?: boolean }) => {
      if (!user) {
        const timeSeconds = Math.round((Date.now() - startTime) / 1000);
        appendGuestSession({
          training_type: "keyword_scanning",
          wpm: null,
          correct: foundCount,
          total: targets.length,
          time_seconds: timeSeconds,
          difficulty,
        });
        openAuthModal();
        return;
      }
      setSaveError(null);
      setSaving(true);
      const timeSeconds = Math.round((Date.now() - startTime) / 1000);
      const payload: SessionInsertPayload = {
        user_id: user.id,
        training_type: "keyword_scanning",
        difficulty,
        wpm: null,
        correct: foundCount,
        total: targets.length,
        time_seconds: timeSeconds,
      };
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("sessions").insert(payload);
          if (error) throw error;
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const code = (err as { code?: string })?.code;
        supabaseLog.error("Failed to save keyword_scanning session", {
          message,
          code,
          userId: user.id,
        });
        if (mountedRef.current) {
          setSaveError(getSessionSaveErrorMessage(err));
        }
        if (mountedRef.current) setSaving(false);
        return;
      }
      supabaseLog.info("Keyword scanning session saved", {
        userId: user.id,
        correct: foundCount,
        total: targets.length,
        time_seconds: timeSeconds,
      });
      trackEvent("trainer_completed", { training_type: "keyword_scanning", difficulty });
      clearActiveTrainer();
      if (!mountedRef.current) return;
      setSaveError(null);
      setSaving(false);
      if (!opts?.skipRestart) {
        setPhase("scanning");
        setFoundSet(new Set());
        setFoundCount(0);
        setStartTime(Date.now());
      }
    },
    [user, foundCount, targets.length, startTime, openAuthModal, difficulty]
  );

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- auto-save on results */
      handleSaveProgress({ skipRestart: true });
    } else {
      const timeSeconds = Math.round((Date.now() - startTime) / 1000);
      appendGuestSession({
        training_type: "keyword_scanning",
        wpm: null,
        correct: foundCount,
        total: targets.length,
        time_seconds: timeSeconds,
      });
    }
  }, [phase, user, handleSaveProgress, startTime, foundCount, targets.length]);

  if (!passage) {
    return <Navigate to="/?mode=keyword_scanning" replace />;
  }

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/train/keyword-scanning` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Verbal Reasoning", url: `${base}/verbal` },
        { name: "Keyword Scanning", url: `${base}/train/keyword-scanning` },
      ]
    : undefined;

  if (phase === "results") {
    const elapsed = resultsElapsedSeconds ?? 0;
    const isPerfect = foundCount === targets.length;
    const isNewBest = isPerfect && (bestTimeSeconds == null || elapsed < bestTimeSeconds);
    const skipLinkClass =
      "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead
          title="UCAT Keyword Scanning Trainer"
          description="Find target words in dense passages. Free keyword scanning practice for UCAT Verbal Reasoning from TheUKCATPeople."
          canonicalUrl={canonicalUrl}
          breadcrumbs={breadcrumbs}
        />
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4" tabIndex={-1}>
          <div className="w-full max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Keyword Scanning - Results
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
              {isNewBest && (
                <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  New best!
                </p>
              )}
              <p className="text-lg text-slate-700">
                Found {foundCount}/{targets.length} in {elapsed}s
              </p>
              <p className="text-slate-600 text-sm">
                Accuracy: {targets.length > 0 ? Math.round((foundCount / targets.length) * 100) : 0}%
              </p>
              {bestTimeSeconds != null && !isNewBest && (
                <p className="text-slate-600 text-sm">
                  Best time ({keywordCount} keywords): {bestTimeSeconds}s. Try to beat it next time.
                </p>
              )}
              {bestTimeSeconds != null && isNewBest && elapsed < bestTimeSeconds && (
                <p className="text-slate-600 text-sm">
                  Previous best: {bestTimeSeconds}s
                </p>
              )}
            </div>
            {saveError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {saveError}
              </p>
            )}
            {saving && (
              <p className="mb-4 text-sm text-slate-600 inline-flex items-center gap-2" aria-live="polite">
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" aria-hidden />
                Saving…
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                hasAutoSavedRef.current = false;
                setPhase("scanning");
                setFoundSet(new Set());
                setFoundCount(0);
                setStartTime(Date.now());
                setPassage((current) => pickNewRandomPassage(current?.id, difficulty));
              }}
              className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Try another passage
            </button>
            <div className="mt-4">
              <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-sm text-slate-500 hover:text-blue-600">
                Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <SEOHead
        title="UCAT Keyword Scanning Trainer"
        description="Find target words in dense passages. Free keyword scanning practice for UCAT Verbal Reasoning from TheUKCATPeople."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 py-10 px-4" tabIndex={-1}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  Find these words
                </p>
                <span
                  className="inline-flex items-center justify-center min-w-[4.5rem] px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"
                  aria-live="polite"
                >
                  {foundCount}/{targets.length} found
                </span>
              </div>
              <button
                onClick={() => {
                  setResultsElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
                  setPhase("results");
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline px-2 py-1"
              >
                Finish & View Results
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {targets.map((target) => {
                const found = foundSet.has(target.toLowerCase());
                return (
                  <span
                    key={target}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${found
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
                      : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                  >
                    {found && (
                      <span className="text-emerald-600 shrink-0" aria-hidden>
                        ✓
                      </span>
                    )}
                    {target}
                  </span>
                );
              })}
            </div>
          </div>
          {targets.length < keywordCount && targets.length > 0 && (
            <p className="text-xs text-slate-500 mb-3 px-0.5">
              Short passage: only {targets.length} keyword{targets.length !== 1 ? "s" : ""} available.
            </p>
          )}
          <div
            className={`bg-white rounded-xl border shadow-sm p-6 transition-colors ${clickedWrong ? "border-red-300 ring-2 ring-red-100" : "border-slate-200"
              }`}
          >
            <div className="text-slate-800 leading-[1.7] space-y-5 text-[15px]">
              {paragraphs.map((wordsInParagraph, pIdx) => (
                <p key={pIdx} className="flex flex-wrap gap-x-2 gap-y-1">
                  {wordsInParagraph.map((word, wIdx) => {
                    const normalized = word.toLowerCase().replace(/[^\w]/g, "");
                    const isTarget = targetSet.has(normalized);
                    const isFound = foundSet.has(normalized);
                    return (
                      <span
                        key={`${pIdx}-${wIdx}-${word}`}
                        onClick={() => isTarget && !isFound && handleWordClick(normalized)}
                        className={`${isTarget ? "cursor-pointer rounded px-1 inline-block align-baseline" : ""
                          } ${isFound ? "bg-emerald-200 text-emerald-900 font-medium" : ""
                          }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
