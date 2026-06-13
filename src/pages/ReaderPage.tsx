import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import ReaderEngine from "../components/reader/ReaderEngine";
import DistortionQuiz from "../components/quiz/DistortionQuiz";
import ResultsView from "../components/quiz/ResultsView";
import type { QuestionBreakdownItem } from "../components/quiz/DistortionQuiz";
import { useAuth } from "../hooks/useAuth";
import type { Passage } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { appendGuestSession } from "../lib/guestSessions";
import { newClientSessionId, upsertTrainerSession } from "../lib/trainerSessionLog";
import type { TrainerSessionUpsert } from "../lib/trainerSessionLog";
import { supabaseLog } from "../lib/logger";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import {
  getVrPassageCandidates,
  hydrateSeenFromCloud,
  markPassageSeen,
  pickUnseenPassage,
} from "../lib/vrPassageHistory";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { trainerFaqs } from "../data/trainerFaqs";
import {
  clampChunkSize,
  getSuggestedChunkSize,
  loadGuidedChunkingPrefs,
  saveGuidedChunkingPrefs,
} from "../lib/guidedChunkingPreferences";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

type Phase = "reading" | "quiz" | "results";

type ConfigureState = {
  trainingType: "speed_reading";
  passageId: string;
  passage: Passage;
  wpm: number;
  questionCount?: number;
  difficulty?: TrainingDifficulty;
  category?: string;
  guidedChunkingEnabled?: boolean;
  guidedChunkSize?: number;
};

export default function ReaderPage() {
  const location = useLocation();
  const configureState = location.state as ConfigureState | null;
  const [phase, setPhase] = useState<Phase>("reading");
  const [readingKey, setReadingKey] = useState(0);
  const [passage, setPassage] = useState<Passage>(
    () =>
      configureState?.passage ??
      pickUnseenPassage(
        "speed_reading",
        getVrPassageCandidates(configureState?.difficulty, configureState?.category)
      )
  );
  const [wpm, setWpm] = useState<number>(() => configureState?.wpm ?? 300);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [guidedChunkingEnabled] = useState<boolean>(() => {
    if (configureState?.guidedChunkingEnabled != null) return configureState.guidedChunkingEnabled;
    return loadGuidedChunkingPrefs().enabled;
  });
  const [guidedChunkSize, setGuidedChunkSize] = useState<number>(() => {
    if (configureState?.guidedChunkSize != null) return clampChunkSize(configureState.guidedChunkSize);
    return loadGuidedChunkingPrefs().chunkSize;
  });
  const [suggestedChunkSize, setSuggestedChunkSize] = useState<number | null>(null);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState<number | null>(null);
  const hasAutoSavedRef = useRef(false);
  const sessionIdRef = useRef(newClientSessionId());
  const readingStartTimeRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const { user } = useAuth();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    saveGuidedChunkingPrefs({ enabled: guidedChunkingEnabled, chunkSize: guidedChunkSize });
  }, [guidedChunkingEnabled, guidedChunkSize]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  // Hydrate cross-device passage history once per page load (fire-and-forget).
  useEffect(() => {
    if (user) void hydrateSeenFromCloud(user.id);
  }, [user]);

  useEffect(() => {
    if (phase === "reading") {
      readingStartTimeRef.current = Date.now();
      if (passage?.id) markPassageSeen("speed_reading", passage.id);
      trackEvent("trainer_started", {
        training_type: "speed_reading",
        difficulty: configureState?.difficulty ?? "medium",
        passage_id: passage?.id,
      });
      setActiveTrainer("speed_reading", "reading");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
  }, [phase, configureState?.difficulty, passage?.id]);

  useEffect(() => {
    if (phase !== "results") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset of derived suggestion when leaving results; cheap and intentional
      setSuggestedChunkSize(null);
      return;
    }
    if (!guidedChunkingEnabled) {
      setSuggestedChunkSize(null);
      return;
    }
    const accuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;
    const nextSize = getSuggestedChunkSize(guidedChunkSize, accuracy);
    setSuggestedChunkSize(nextSize);
  }, [phase, guidedChunkingEnabled, guidedChunkSize, quizCorrect, quizTotal]);

  const passageText = passage?.text ?? "";
  const wordCount = passageText.trim().split(/\s+/).filter(Boolean).length;
  const questionCount = configureState ? Math.min(3, configureState.questionCount ?? 3) : 3;
  const WPM_MIN = 200;
  const WPM_MAX = 900;
  const difficulty: TrainingDifficulty = configureState?.difficulty ?? "medium";
  const category: string = configureState?.category ?? "all";

  const handleReaderFinish = useCallback((finishedWpm: number, opts?: { timeSpentSeconds: number; usedOvertime?: boolean }) => {
    if (opts?.timeSpentSeconds != null && opts.timeSpentSeconds > 0) {
      setReadingTimeSeconds(opts.timeSpentSeconds);
      setWpm(Math.round((wordCount / opts.timeSpentSeconds) * 60));
    } else {
      // Capture the fallback now, at the end of reading - measuring it at results
      // render time would wrongly include the quiz duration.
      const startedAt = readingStartTimeRef.current;
      setReadingTimeSeconds(
        startedAt != null ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null,
      );
      setWpm(finishedWpm);
    }
    setPhase("quiz");
  }, [wordCount]);

  const handleQuizComplete = useCallback((correct: number, total: number, breakdown: QuestionBreakdownItem[]) => {
    setQuizCorrect(correct);
    setQuizTotal(total);
    setQuestionBreakdown(breakdown);
    setPhase("results");
  }, []);

  const handleSaveProgress = useCallback(
    async (rating?: import("../components/quiz/ResultsView").WpmRating, opts?: { skipRestart?: boolean }) => {
      if (!user) {
        appendGuestSession({
          training_type: "speed_reading",
          difficulty,
          wpm,
          correct: quizCorrect,
          total: quizTotal,
          passage_id: passage?.id ?? null,
          client_session_id: sessionIdRef.current,
          ...(rating != null && { wpm_rating: rating }),
          ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
        });
        return;
      }
      setSaveError(null);
      setSaveInProgress(true);
      const payload: TrainerSessionUpsert = {
        training_type: "speed_reading",
        difficulty,
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
        ...(rating != null && { wpm_rating: rating }),
        ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
      };
      const saved = await upsertTrainerSession(user.id, sessionIdRef.current, payload);
      if (saved) {
        supabaseLog.info("Speed reading session saved", {
          userId: user.id,
          wpm: payload.wpm,
          correct: payload.correct,
          total: payload.total,
        });
        trackEvent("trainer_completed", { training_type: "speed_reading", difficulty });
        clearActiveTrainer();
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          sessionIdRef.current = newClientSessionId();
          setPhase("reading");
          setReadingKey((k) => k + 1);
          readingStartTimeRef.current = null;
        }
      } else {
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(null));
      }
      if (mountedRef.current) setSaveInProgress(false);
    },
    [user, wpm, quizCorrect, quizTotal, passage?.id, difficulty, readingTimeSeconds]
  );

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    sessionIdRef.current = newClientSessionId();
    setReadingTimeSeconds(null);
    setPhase("reading");
    setReadingKey((k) => k + 1);
    setPassage((current) =>
      pickUnseenPassage("speed_reading", getVrPassageCandidates(difficulty, category), current?.id)
    );
    readingStartTimeRef.current = null;
  }, [difficulty, category]);

  const handleRestartWithWpm = useCallback(
    (newWpm: number) => {
      setWpm(Math.min(WPM_MAX, Math.max(WPM_MIN, newWpm)));
      setReadingTimeSeconds(null);
      hasAutoSavedRef.current = false;
      sessionIdRef.current = newClientSessionId();
      setPhase("reading");
      setReadingKey((k) => k + 1);
      setPassage((current) =>
        pickUnseenPassage("speed_reading", getVrPassageCandidates(difficulty, category), current?.id)
      );
      readingStartTimeRef.current = null;
    },
    [difficulty, category]
  );

  const handleApplySuggestedChunkSize = useCallback(() => {
    if (suggestedChunkSize == null) return;
    setGuidedChunkSize(suggestedChunkSize);
    setSuggestedChunkSize(null);
  }, [suggestedChunkSize]);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-save on entering results; guarded by hasAutoSavedRef
      handleSaveProgress(undefined, { skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "speed_reading",
        difficulty,
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
        client_session_id: sessionIdRef.current,
        ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
      });
    }
  }, [phase, handleSaveProgress, user, wpm, quizCorrect, quizTotal, passage?.id, difficulty, readingTimeSeconds]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const base = getSiteBaseUrl();
  const readerCanonical = base ? `${base}/ucat-verbal-reasoning-speed-reading-trainer` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt =
    "UCAT speed reading trainer showing a timed passage and progress statistics for Verbal Reasoning practice";
  const readerBreadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Verbal Reasoning", url: `${base}/ucat-verbal-reasoning-practice` },
        { name: "Speed Reading", url: `${base}/ucat-verbal-reasoning-speed-reading-trainer` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="UCAT speed reading trainer (UK)"
        description="Practice dense academic passages with speed reading and scanning tools. Free Verbal Reasoning skills training for the UCAT in the UK."
        canonicalUrl={readerCanonical}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={readerBreadcrumbs}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 flex flex-col py-8 px-4 min-w-0" tabIndex={-1}>
        <div className="w-full max-w-5xl mx-auto mb-4">
          <BreadcrumbNav items={readerBreadcrumbs} />
        </div>
        <div className="flex-1 flex items-center justify-center">
        {phase === "reading" && (
          <ReaderEngine
            key={`reading-${readingKey}`}
            text={passageText}
            initialWpm={wpm}
            onFinish={handleReaderFinish}
            passageTitle={passage?.title}
            passageMedia={passage?.media}
            wordCount={wordCount}
            guidedChunkingEnabled={guidedChunkingEnabled}
            chunkSize={guidedChunkSize}
          />
        )}
        {phase === "quiz" && (
          <DistortionQuiz
            passageText={passageText}
            passageTitle={passage?.title}
            passageId={passage?.id ?? "unknown"}
            trainerType="speed_reading"
            onComplete={handleQuizComplete}
            questionCount={questionCount}
          />
        )}
        {phase === "results" && (
          <ResultsView
            wpm={wpm}
            correct={quizCorrect}
            total={quizTotal}
            passageTitle={passage?.title}
            passageText={passageText}
            timeSpentSeconds={readingTimeSeconds ?? 0}
            questionBreakdown={questionBreakdown}
            onRestart={handleRestart}
            onTrySlowerWpm={() => handleRestartWithWpm(wpm - 25)}
            onTrySameSettings={() => handleRestart()}
            onTryFasterWpm={() => handleRestartWithWpm(wpm + 25)}
            saveError={saveError}
            saving={saveInProgress}
            guidedChunkingEnabled={guidedChunkingEnabled}
            chunkSize={guidedChunkSize}
            suggestedChunkSize={suggestedChunkSize}
            onAcceptSuggestedChunkSize={handleApplySuggestedChunkSize}
          />
        )}
        </div>
      </main>
      <UcatGuidesPanel context="trainer" trainingType="speed_reading" contentMaxWidthClass="max-w-6xl mx-auto w-full" />
      <TrainerFaqSection
        id="speed-reading-faq"
        title="Common questions about the UCAT speed reading trainer"
        intro="Frequently asked questions about using this speed reading tool to build safe words-per-minute targets and better Verbal Reasoning timing for the UCAT."
        faqs={trainerFaqs.speedReading}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
