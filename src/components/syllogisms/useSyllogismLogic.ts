/**
 * Core syllogism drill state and actions (micro and macro modes).
 * UK English in comments.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { saveSyllogismSession } from "../../utils/syllogismStorage";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../../lib/analytics";
import type { SyllogismQuestion, LogicGroup } from "../../types/syllogisms";

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

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type SyllogismMode = "micro" | "macro";

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
  /** Macro: mirror of userAnswers so finishSession always reads latest (avoids stale closure). */
  const userAnswersRef = useRef<(boolean | null)[]>(userAnswers);

  const isMicro = mode === "micro";
  const isMacro = mode === "macro";

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

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
    setLoading(true);
    setError(null);
    setSessionFinished(false);
    setLastSummary(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("syllogism_questions")
        .select(
          "id, macro_block_id, stimulus_text, conclusion_text, is_correct, logic_group, trick_type, explanation"
        )
        .limit(count * 3);
      if (fetchErr) throw fetchErr;
      type DbRow = { id: string; macro_block_id?: string; stimulus_text: string; conclusion_text: string; is_correct: boolean; logic_group: string; trick_type: string; explanation: string };
      const rawList: SyllogismQuestion[] =
        data?.map((row: DbRow) => ({
          id: row.id,
          macro_block_id: row.macro_block_id ?? row.id,
          stimulus_text: row.stimulus_text,
          conclusion_text: row.conclusion_text,
          is_correct: row.is_correct,
          logic_group: row.logic_group as LogicGroup,
          trick_type: row.trick_type,
          explanation: row.explanation,
        })) ?? [];

      if (rawList.length === 0) {
        setError(SEED_ERROR_MESSAGE);
        setQuestions([]);
        setUserAnswers([]);
        return;
      }

      const list = shuffle(rawList).slice(0, count);
      setQuestions(list);
      setUserAnswers(list.map(() => null));
      setCurrentIndex(0);
      resetTiming();
    } catch (e) {
      console.error("Syllogism fetch error", e);
      setError(toErrorMessage(e));
      setQuestions([]);
      setUserAnswers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMacroBlock = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSessionFinished(false);
    setLastSummary(null);
    const MACRO_FETCH_TIMEOUT_MS = 15000;
    try {
      // Fetch enough rows to include all macro blocks (5 questions each). Micro questions
      // use unique macro_block_ids, so we must group client-side and pick only blocks with 5.
      const queryPromise = supabase
        .from("syllogism_questions")
        .select(
          "id, macro_block_id, stimulus_text, conclusion_text, is_correct, logic_group, trick_type, explanation"
        )
        .not("macro_block_id", "is", null)
        .limit(1500);
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                "Request timed out. Check your connection and try again."
              )
            ),
          MACRO_FETCH_TIMEOUT_MS
        );
      });
      const result = await Promise.race([
        queryPromise.then((r) => {
          clearTimeout(timeoutId!);
          return r;
        }),
        timeoutPromise,
      ]);
      const { data: rows, error: fetchErr } = result;
      if (fetchErr) throw fetchErr;
      type DbRow = { id: string; macro_block_id?: string; stimulus_text: string; conclusion_text: string; is_correct: boolean; logic_group: string; trick_type: string; explanation: string };
      const raw =
        rows?.map((row: DbRow) => ({
          id: row.id,
          macro_block_id: row.macro_block_id ?? row.id,
          stimulus_text: row.stimulus_text,
          conclusion_text: row.conclusion_text,
          is_correct: row.is_correct,
          logic_group: row.logic_group as LogicGroup,
          trick_type: row.trick_type,
          explanation: row.explanation,
        })) ?? [];

      const byBlock = new Map<string, SyllogismQuestion[]>();
      raw.forEach((q: SyllogismQuestion) => {
        const id = q.macro_block_id;
        if (!byBlock.has(id)) byBlock.set(id, []);
        byBlock.get(id)!.push(q);
      });
      const fullBlocks = [...byBlock.values()].filter(
        (group) => group.length === 5
      );
      if (fullBlocks.length === 0) {
        setError(SEED_ERROR_MESSAGE);
        setQuestions([]);
        setUserAnswers([]);
        return;
      }
      const chosen =
        fullBlocks[Math.floor(Math.random() * fullBlocks.length)];
      const list = chosen.sort(
        (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );

      setQuestions(list);
      setUserAnswers(list.map(() => null));
      setCurrentIndex(0);
      resetTiming();
    } catch (e) {
      console.error("Syllogism macro fetch error", e);
      setError(toErrorMessage(e));
      setQuestions([]);
      setUserAnswers([]);
    } finally {
      setLoading(false);
    }
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
    const correct = questions.filter(
      (q, i) => answers[i] === q.is_correct
    ).length;
    const total = questions.length;
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

  /** Micro only: move to next question or finish session if on last and answered. */
  const advanceToNext = useCallback(() => {
    if (!isMicro || questions.length === 0) return;
    const hasAnswer = userAnswers[currentIndex] !== null;
    const justAnswered = justAnsweredIndexRef.current === currentIndex;
    if (!hasAnswer && !justAnswered) return;
    justAnsweredIndexRef.current = null;
    if (currentIndex === questions.length - 1) {
      void finishSession();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isMicro, questions.length, currentIndex, userAnswers, finishSession]);

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
    fetchMicroQuestions,
    fetchMacroBlock,
    submitAnswer,
    setAnswerForIndex,
    advanceToNext,
    finishSession,
    getLatestUserAnswers,
  };
}
