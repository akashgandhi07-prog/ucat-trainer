import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { fetchDmTrainerDrill } from "../lib/dmTrainerApi";
import { persistDmTrainerSession } from "../lib/dmTrainerSessionStorage";
import type { DmTrainerAttemptInput } from "../lib/dmTrainerSessionStorage";
import type {
  DmTrainerOptionId,
  DmTrainerQuestion,
  DmTrainerSessionAnswer,
  DmTrainerType,
} from "../types/dmTrainers";
import { getDmTrainerConfig } from "../data/dmTrainers/trainerConfig";

export type DmTrainerPhase = "intro" | "drill" | "results";

// Each drill serves a random, shuffled subset of the bank rather than the
// whole thing in fixed legacy_id order (which let students memorise positions).
const DRILL_SIZE = 10;

function sampleDrillQuestions(pool: DmTrainerQuestion[]): DmTrainerQuestion[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DRILL_SIZE);
}

export function useDmSkillsTrainer(trainerType: DmTrainerType) {
  const config = getDmTrainerConfig(trainerType);
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<DmTrainerPhase>("intro");
  const [questions, setQuestions] = useState<DmTrainerQuestion[]>([]);
  // The sampled+shuffled subset served for the current drill (see startDrill).
  const [drillQuestions, setDrillQuestions] = useState<DmTrainerQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionSource, setQuestionSource] = useState<"supabase" | "local" | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByIndex, setAnswersByIndex] = useState<(DmTrainerSessionAnswer | null)[]>(
    [],
  );
  const [selected, setSelected] = useState<DmTrainerOptionId | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [retryMode, setRetryMode] = useState(false);
  const [retryQueue, setRetryQueue] = useState<DmTrainerQuestion[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryModeRef = useRef(false);
  const answersByIndexRef = useRef(answersByIndex);
  // Per-question attempt rows (null for unanswered or local-JSON questions
  // whose ids don't exist in trainer_questions).
  const attemptInputsRef = useRef<(DmTrainerAttemptInput | null)[]>([]);
  // Timestamp when the current unanswered question was shown, for time_taken_seconds.
  const questionShownAtRef = useRef<number>(Date.now());
  // Per-drill guard so a partial flush never double-saves a completed drill
  // (dm_trainer_sessions has no unique client id to dedupe on).
  const sessionSavedRef = useRef(false);
  const phaseRef = useRef(phase);
  const userIdRef = useRef<string | null>(user?.id ?? null);

  const activeQuestions = retryMode ? retryQueue : drillQuestions;
  const current = activeQuestions[currentIndex] ?? null;
  const total = activeQuestions.length;
  const answers = answersByIndex.filter(
    (a): a is DmTrainerSessionAnswer => a != null,
  );
  const answeredCount = answersByIndex.filter((a) => a != null).length;
  const correctCount = answersByIndex.filter((a) => a?.correct).length;

  useEffect(() => {
    answersByIndexRef.current = answersByIndex;
  }, [answersByIndex]);

  useEffect(() => {
    retryModeRef.current = retryMode;
  }, [retryMode]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const { questions: loaded, source } = await fetchDmTrainerDrill(trainerType);
      if (loaded.length === 0) {
        setQuestionsError("No questions available for this trainer yet.");
        setQuestions([]);
      } else {
        setQuestions(loaded);
        setQuestionSource(source);
      }
    } catch {
      setQuestionsError("Could not load questions. Check your connection and try again.");
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [trainerType]);

  useEffect(() => {
    if (authLoading) return;
    void loadQuestions();
  }, [authLoading, loadQuestions]);

  useEffect(() => {
    if (phase !== "drill") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (startTimeRef.current == null) {
      startTimeRef.current = Date.now();
    }
    timerRef.current = setInterval(() => {
      if (startTimeRef.current != null) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startDrill = useCallback(() => {
    if (questions.length === 0) return;
    const drill = sampleDrillQuestions(questions);
    setDrillQuestions(drill);
    setPhase("drill");
    setCurrentIndex(0);
    setAnswersByIndex(drill.map(() => null));
    setSelected(null);
    setShowFeedback(false);
    setRetryMode(false);
    setRetryQueue([]);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    attemptInputsRef.current = drill.map(() => null);
    questionShownAtRef.current = Date.now();
    sessionSavedRef.current = false;
  }, [questions]);

  const submitAnswer = useCallback(
    (optionId: DmTrainerOptionId) => {
      if (!current || showFeedback) return;
      const correct = optionId === current.correctAnswer;
      const timeTakenSeconds = Math.max(
        0,
        Math.round((Date.now() - questionShownAtRef.current) / 1000),
      );
      setSelected(optionId);
      setShowFeedback(true);
      // Only DB-backed questions carry dbId (trainer_questions UUID); local
      // fallback questions are never logged to trainer_question_attempts.
      attemptInputsRef.current[currentIndex] = current.dbId
        ? {
            questionDbId: current.dbId,
            skillTag: current.skillTag || "unknown",
            difficulty: current.difficulty || "medium",
            isCorrect: correct,
            selectedAnswer: optionId,
            timeTakenSeconds,
          }
        : null;
      setAnswersByIndex((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          questionId: current.id,
          selected: optionId,
          correct,
          skillTag: current.skillTag,
          timeTakenSeconds,
        };
        return next;
      });
    },
    [current, showFeedback, currentIndex],
  );

  const restoreQuestionView = useCallback((index: number) => {
    const stored = answersByIndexRef.current[index];
    if (stored) {
      setSelected(stored.selected);
      setShowFeedback(true);
    } else {
      setSelected(null);
      setShowFeedback(false);
      questionShownAtRef.current = Date.now();
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    restoreQuestionView(newIndex);
  }, [currentIndex, restoreQuestionView]);

  const goToNextQuestion = useCallback(() => {
    if (currentIndex >= total - 1) return;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    restoreQuestionView(newIndex);
  }, [currentIndex, total, restoreQuestionView]);

  const goToNext = useCallback(() => {
    if (!showFeedback) return;
    const isLast = currentIndex >= total - 1;
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowFeedback(false);
      questionShownAtRef.current = Date.now();
      return;
    }

    const completed = answersByIndexRef.current.filter(
      (a): a is DmTrainerSessionAnswer => a != null,
    );
    const summary = {
      trainerType,
      correct: completed.filter((a) => a.correct).length,
      total: completed.length,
      elapsedSeconds,
      answers: completed,
      completedAt: new Date().toISOString(),
    };
    sessionSavedRef.current = true;
    const attempts = attemptInputsRef.current.filter(
      (a): a is DmTrainerAttemptInput => a != null,
    );
    void persistDmTrainerSession(user?.id ?? null, summary, retryModeRef.current, {
      attempts,
      completed: true,
    });
    setPhase("results");
  }, [showFeedback, currentIndex, total, trainerType, elapsedSeconds, user?.id]);

  /**
   * Flush partial progress when the user abandons mid-drill (unmount or
   * pagehide) so answered-so-far work isn't lost. Mirrors the SJT
   * flushPartialIfNeeded convention. total_questions is the ANSWERED count
   * (the table CHECKs total_questions > 0, so zero-answer drills are skipped),
   * and sessionSavedRef guards against double-saving a completed drill.
   */
  const flushPartialIfNeeded = useCallback(() => {
    if (phaseRef.current !== "drill") return;
    if (sessionSavedRef.current) return;
    const completed = answersByIndexRef.current.filter(
      (a): a is DmTrainerSessionAnswer => a != null,
    );
    if (completed.length === 0) return;
    sessionSavedRef.current = true;

    const elapsed =
      startTimeRef.current != null
        ? Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))
        : 0;
    const summary = {
      trainerType,
      correct: completed.filter((a) => a.correct).length,
      total: completed.length,
      elapsedSeconds: elapsed,
      answers: completed,
      completedAt: new Date().toISOString(),
    };
    const attempts = attemptInputsRef.current.filter(
      (a): a is DmTrainerAttemptInput => a != null,
    );
    void persistDmTrainerSession(userIdRef.current, summary, retryModeRef.current, {
      attempts,
      completed: false,
    });
  }, [trainerType]);

  useEffect(() => {
    window.addEventListener("pagehide", flushPartialIfNeeded);
    return () => window.removeEventListener("pagehide", flushPartialIfNeeded);
  }, [flushPartialIfNeeded]);

  useEffect(() => {
    return () => {
      flushPartialIfNeeded();
    };
  }, [flushPartialIfNeeded]);

  const restartDrill = useCallback(() => {
    startDrill();
  }, [startDrill]);

  const retryIncorrect = useCallback(() => {
    const incorrectIds = new Set(answers.filter((a) => !a.correct).map((a) => a.questionId));
    const queue = drillQuestions.filter((q) => incorrectIds.has(q.id));
    if (queue.length === 0) return;
    setRetryMode(true);
    setRetryQueue(queue);
    setPhase("drill");
    setCurrentIndex(0);
    setAnswersByIndex(queue.map(() => null));
    setSelected(null);
    setShowFeedback(false);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    attemptInputsRef.current = queue.map(() => null);
    questionShownAtRef.current = Date.now();
    sessionSavedRef.current = false;
  }, [answers, drillQuestions]);

  const backToIntro = useCallback(() => {
    setPhase("intro");
    setCurrentIndex(0);
    setAnswersByIndex([]);
    setSelected(null);
    setShowFeedback(false);
    setRetryMode(false);
    setRetryQueue([]);
    setElapsedSeconds(0);
    startTimeRef.current = null;
  }, []);

  const incorrectCount = answers.filter((a) => !a.correct).length;

  return {
    config,
    phase,
    questions,
    questionsLoading,
    questionsError,
    questionSource,
    reloadQuestions: loadQuestions,
    current,
    currentIndex,
    total,
    selected,
    showFeedback,
    elapsedSeconds,
    answers,
    answeredCount,
    correctCount,
    incorrectCount,
    retryMode,
    startDrill,
    submitAnswer,
    goToPrevious,
    goToNextQuestion,
    goToNext,
    restartDrill,
    retryIncorrect,
    backToIntro,
  };
}
