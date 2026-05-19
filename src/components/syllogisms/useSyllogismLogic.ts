/**
 * Core syllogism drill state and actions (micro and macro modes).
 * UK English in comments.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  fetchSyllogismFoundationBatch,
  fetchSyllogismMacroBlock,
  fetchSyllogismMicroBatch,
  isAbortError,
} from "../../lib/syllogismApi";
import { saveSyllogismSession } from "../../utils/syllogismStorage";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../../lib/analytics";
import type { SyllogismQuestion, LogicGroup, SyllogismMode } from "../../types/syllogisms";

// User-facing message when no questions are available (do not expose seed script or env vars).
const SEED_ERROR_MESSAGE =
  "No syllogism questions available. Please try again later or contact support.";

/** Always produce a readable string for the UI (avoids "[object Object]" for Supabase/PostgrestError). */
function toErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e.trim().length > 0) return e;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return "Failed to load syllogism questions. Please try again or check your connection.";
}

export interface SyllogismSessionSummary {
  score: number;
  total_questions: number;
  correct: number;
  average_time_per_decision: number;
  elapsed_seconds: number;
}

export function useSyllogismLogic(mode: SyllogismMode) {
  const [questions, setQuestions] = useState<SyllogismQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(boolean | null)[]>([]);
  const [decisionTimes, setDecisionTimes] = useState<number[]>([]);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [lastSummary, setLastSummary] =
    useState<SyllogismSessionSummary | null>(null);

  const startedAtRef = useRef<number>(0);
  const lastAnswerAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Micro: set when submitAnswer is called so Space can advance before state flushes. */
  const justAnsweredIndexRef = useRef<number | null>(null);
  /** Macro: block ids already used this tab session (avoid immediate repeats). */
  const seenBlockIdsRef = useRef<string[]>([]);
  const fetchAbortRef = useRef<AbortController | null>(null);
  /** Macro: mirror of userAnswers so finishSession always reads latest (avoids stale closure). */
  const userAnswersRef = useRef<(boolean | null)[]>(userAnswers);
  /** For pagehide/unmount autosave - avoids double-save if both fire. */
  const savedOnExitRef = useRef(false);
  const sessionFinishedRef = useRef(false);
  const finishSessionRef = useRef<() => Promise<SyllogismSessionSummary | null>>(() => Promise.resolve(null));

  const isMacro = mode === "macro";
  const isLinearMode = mode === "micro" || mode === "foundation";

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    sessionFinishedRef.current = sessionFinished;
    if (sessionFinished) savedOnExitRef.current = true; // already saved, suppress exit save
  }, [sessionFinished]);

  const recordDecisionTime = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - lastAnswerAtRef.current) / 1000;
    setDecisionTimes((prev) => [...prev, elapsed]);
    lastAnswerAtRef.current = now;
  }, []);

  useEffect(() => {
    if (!loading && questions.length > 0 && !sessionFinished) {
      trackEvent("trainer_started", {
        training_type: "syllogism",
        mode,
        total_questions: questions.length,
      });
      setActiveTrainer("syllogism", mode);
    } else if (sessionFinished) {
      clearActiveTrainer();
    }
  }, [loading, questions.length, sessionFinished, mode]);

  useEffect(() => {
    if (questions.length === 0 || sessionFinished) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setTotalElapsedSeconds(
        Math.floor((Date.now() - startedAtRef.current) / 1000)
      );
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [questions.length, sessionFinished]);

  const resetTiming = () => {
    const now = Date.now();
    startedAtRef.current = now;
    lastAnswerAtRef.current = now;
    setTotalElapsedSeconds(0);
    setDecisionTimes([]);
  };

  const fetchMicroQuestions = useCallback(async (count: number) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    setSessionFinished(false);
    setLastSummary(null);
    savedOnExitRef.current = false;
    try {
      const list = await fetchSyllogismMicroBatch(count, controller.signal);
      if (controller.signal.aborted) return;

      if (list.length === 0) {
        setError(SEED_ERROR_MESSAGE);
        setQuestions([]);
        setUserAnswers([]);
        return;
      }

      setQuestions(list);
      setUserAnswers(list.map(() => null));
      setCurrentIndex(0);
      resetTiming();
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e)) return;
      console.error("Syllogism fetch error", e);
      setError(toErrorMessage(e));
      setQuestions([]);
      setUserAnswers([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const fetchFoundationQuestions = useCallback(async (count: number) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    setSessionFinished(false);
    setLastSummary(null);
    savedOnExitRef.current = false;
    try {
      const list = await fetchSyllogismFoundationBatch(count, controller.signal);
      if (controller.signal.aborted) return;

      if (list.length === 0) {
        setError(SEED_ERROR_MESSAGE);
        setQuestions([]);
        setUserAnswers([]);
        return;
      }

      setQuestions(list);
      setUserAnswers(list.map(() => null));
      setCurrentIndex(0);
      resetTiming();
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e)) return;
      console.error("Syllogism foundation fetch error", e);
      setError(toErrorMessage(e));
      setQuestions([]);
      setUserAnswers([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMacroBlock = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    setSessionFinished(false);
    setLastSummary(null);
    savedOnExitRef.current = false;
    try {
      const list = await fetchSyllogismMacroBlock(seenBlockIdsRef.current, controller.signal);
      if (controller.signal.aborted) return;

      if (list.length !== 5) {
        setError(SEED_ERROR_MESSAGE);
        setQuestions([]);
        setUserAnswers([]);
        return;
      }

      seenBlockIdsRef.current = [...seenBlockIdsRef.current, list[0].macro_block_id];
      setQuestions(list);
      setUserAnswers(list.map(() => null));
      setCurrentIndex(0);
      resetTiming();
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e)) return;
      console.error("Syllogism macro fetch error", e);
      setError(toErrorMessage(e));
      setQuestions([]);
      setUserAnswers([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, []);

  // Autosave partial progress on tab close or SPA navigation away.
  // pagehide covers actual tab/window close; cleanup covers React Router navigation.
  useEffect(() => {
    const saveOnExit = () => {
      if (savedOnExitRef.current) return;
      const answeredCount = userAnswersRef.current.filter((a) => a !== null).length;
      if (answeredCount === 0) return;
      savedOnExitRef.current = true;
      void finishSessionRef.current();
    };

    window.addEventListener("pagehide", saveOnExit);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      saveOnExit(); // covers SPA navigation (component unmounts without pagehide)
    };
  }, []);

  const submitAnswer = useCallback(
    (answer: boolean) => {
      if (questions.length === 0) return;
      const idx = currentIndex;
      if (idx >= questions.length) return;
      if (userAnswers[idx] !== null) return;
      recordDecisionTime();
      justAnsweredIndexRef.current = idx;
      setUserAnswers((prev) => {
        const next = [...prev];
        next[idx] = answer;
        return next;
      });
    },
    [questions.length, currentIndex, userAnswers, recordDecisionTime]
  );

  const setAnswerForIndex = useCallback((index: number, answer: boolean) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next[index] = answer;
      }
      return next;
    });
  }, []);

  const computePerGroupAccuracy = useCallback(
    (answers: (boolean | null)[]) => {
      const byGroup: Record<
        LogicGroup,
        { correct: number; total: number }
      > = {
        categorical: { correct: 0, total: 0 },
        relative: { correct: 0, total: 0 },
        majority: { correct: 0, total: 0 },
        complex: { correct: 0, total: 0 },
      };
      questions.forEach((q, i) => {
        const a = answers[i];
        if (a === null) return;
        byGroup[q.logic_group].total += 1;
        if (a === q.is_correct) byGroup[q.logic_group].correct += 1;
      });
      const acc: Record<string, number | null> = {};
      (["categorical", "relative", "majority", "complex"] as const).forEach(
        (g) => {
          const { correct, total } = byGroup[g];
          acc[`${g}_accuracy`] = total > 0 ? correct / total : null;
        }
      );
      return acc;
    },
    [questions]
  );

  const finishSession = useCallback(async () => {
    if (questions.length === 0 || sessionFinished) return null;

    const answers = userAnswersRef.current;
    const answeredCount = answers.filter((a) => a !== null).length;
    if (answeredCount === 0) return null;

    const correct = questions.filter(
      (q, i) => answers[i] === q.is_correct
    ).length;
    const total = answeredCount;
    const times = decisionTimes;
    const avgTime =
      times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : totalElapsedSeconds / Math.max(1, total);

    let score: number;
    if (isMacro && total === 5) {
      score = correct === 5 ? 2 : correct === 4 ? 1 : 0;
    } else {
      score = correct;
    }

    const perGroup = computePerGroupAccuracy(answers);
    const summary: SyllogismSessionSummary = {
      score,
      total_questions: total,
      correct,
      average_time_per_decision: Math.round(avgTime * 100) / 100,
      elapsed_seconds: totalElapsedSeconds,
    };
    setLastSummary(summary);
    setSessionFinished(true);

    await saveSyllogismSession({
      mode,
      score,
      total_questions: total,
      average_time_per_decision: avgTime,
      perGroupAccuracies: {
        categorical_accuracy: perGroup.categorical_accuracy ?? null,
        relative_accuracy: perGroup.relative_accuracy ?? null,
        majority_accuracy: perGroup.majority_accuracy ?? null,
        complex_accuracy: perGroup.complex_accuracy ?? null,
      },
    });

    return summary;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- userAnswers kept for consistency with summary computation
  }, [
    questions,
    userAnswers,
    decisionTimes,
    totalElapsedSeconds,
    mode,
    isMacro,
    computePerGroupAccuracy,
    sessionFinished,
  ]);

  /** Linear modes: move to next question or finish session if on last and answered. */
  const advanceToNext = useCallback(() => {
    if (!isLinearMode || questions.length === 0) return;
    const hasAnswer = userAnswers[currentIndex] !== null;
    const justAnswered = justAnsweredIndexRef.current === currentIndex;
    if (!hasAnswer && !justAnswered) return;
    justAnsweredIndexRef.current = null;
    if (currentIndex === questions.length - 1) {
      void finishSession();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLinearMode, questions.length, currentIndex, userAnswers, finishSession]);

  // Keep finishSessionRef pointing at the latest callback (avoids stale closure in exit handler).
  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  /** Macro: get latest answers (ref) so validation before submit uses current state. */
  const getLatestUserAnswers = useCallback(() => userAnswersRef.current, []);

  return {
    questions,
    currentIndex,
    userAnswers,
    decisionTimes,
    totalElapsedSeconds,
    loading,
    error,
    sessionFinished,
    lastSummary,
    fetchFoundationQuestions,
    fetchMicroQuestions,
    fetchMacroBlock,
    submitAnswer,
    setAnswerForIndex,
    advanceToNext,
    finishSession,
    getLatestUserAnswers,
  };
}
