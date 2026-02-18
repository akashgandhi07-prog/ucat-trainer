import { useState, useCallback, useRef, useEffect } from "react";
import { getQuestionForStage, isExactAnswerCorrect } from "../components/mentalMaths/mathsAlgorithms";
import type { QuestionPayload } from "../components/mentalMaths/mathsAlgorithms";
import {
  MENTAL_MATHS_STAGES,
  getHighestUnlockedStage,
  setHighestUnlockedStage,
} from "../components/mentalMaths/mentalMathsStages";

export type MentalMathsStatus = "idle" | "active" | "review" | "summary";

export interface MentalMathsSummaryStats {
  correct: number;
  total: number;
  accuracyPct: number;
  avgTimeMs: number;
  stageIndex: number;
  stageName: string;
  passedThresholds: boolean;
}

export function useMentalMathsLogic(onSessionComplete?: (stats: MentalMathsSummaryStats) => void) {
  const [status, setStatus] = useState<MentalMathsStatus>("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [responseTimesMs, setResponseTimesMs] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [summaryStats, setSummaryStats] = useState<MentalMathsSummaryStats | null>(null);
  const [elapsedQuestionSeconds, setElapsedQuestionSeconds] = useState(0);

  const questionShownAtRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stageConfig = MENTAL_MATHS_STAGES[currentStage];
  const questionCount = stageConfig?.questionCount ?? 8;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Read refs in cleanup to clear whatever timers are current at unmount
      /* eslint-disable-next-line react-hooks/exhaustive-deps -- capture refs in cleanup to clear current timers */
      const t = timeoutRef.current;
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
      const i = intervalRef.current;
      if (t) clearTimeout(t);
      if (i) clearInterval(i);
    };
  }, []);

  // Per-question timer: only ticks while status is active (resets when question changes)
  useEffect(() => {
    if (status !== "active") return;
    setElapsedQuestionSeconds(Math.floor((Date.now() - questionShownAtRef.current) / 1000));
    const interval = setInterval(() => {
      setElapsedQuestionSeconds(Math.floor((Date.now() - questionShownAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, questionIndex]);

  const highestUnlocked = getHighestUnlockedStage();

  const startStage = useCallback(
    (stageIndex: number) => {
      if (stageIndex > highestUnlocked) return;
      const config = MENTAL_MATHS_STAGES[stageIndex];
      if (!config) return;
      setCurrentStage(stageIndex);
      setQuestionIndex(0);
      setCorrectCount(0);
      setResponseTimesMs([]);
      setLastCorrect(null);
      setSummaryStats(null);
      const q = getQuestionForStage(stageIndex);
      setCurrentQuestion(q);
      setUserAnswer(null);
      questionShownAtRef.current = Date.now();
      sessionStartRef.current = Date.now();
      setStatus("active");
    },
    [highestUnlocked]
  );

  const submitExact = useCallback(
    (value: number) => {
      if (status !== "active" || !currentQuestion || currentQuestion.kind !== "exact") return;
      const elapsed = Date.now() - questionShownAtRef.current;
      setResponseTimesMs((prev) => [...prev, elapsed]);
      const correct = isExactAnswerCorrect(value, currentQuestion.answer);
      setCorrectCount((c) => c + (correct ? 1 : 0));
      setLastCorrect(correct);
      setUserAnswer(value);
      setStatus("review");
    },
    [status, currentQuestion]
  );

  const submitMcq = useCallback(
    (selectedIndex: number) => {
      if (status !== "active" || !currentQuestion || currentQuestion.kind !== "mcq") return;
      const elapsed = Date.now() - questionShownAtRef.current;
      setResponseTimesMs((prev) => [...prev, elapsed]);
      const correct = selectedIndex === currentQuestion.correctIndex;
      setCorrectCount((c) => c + (correct ? 1 : 0));
      setLastCorrect(correct);
      setUserAnswer(selectedIndex);
      setStatus("review");
    },
    [status, currentQuestion]
  );

  const skipQuestion = useCallback(() => {
    if (status !== "active") return;
    const elapsed = Date.now() - questionShownAtRef.current;
    setResponseTimesMs((prev) => [...prev, elapsed]);
    setCorrectCount((c) => c); // no change = count as wrong
    const nextIndex = questionIndex + 1;
    if (nextIndex >= questionCount) {
      const times = [...responseTimesMs, elapsed];
      const avgTimeMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const correct = correctCount;
      const total = questionCount;
      const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const config = MENTAL_MATHS_STAGES[currentStage];
      const passedThresholds =
        accuracyPct >= (config?.requiredAccuracy ?? 80) &&
        avgTimeMs <= (config?.maxAvgTimeMs ?? 10000);
      if (passedThresholds && currentStage < MENTAL_MATHS_STAGES.length - 1) {
        setHighestUnlockedStage(currentStage + 1);
      }
      const stats: MentalMathsSummaryStats = {
        correct,
        total,
        accuracyPct,
        avgTimeMs,
        stageIndex: currentStage,
        stageName: config?.name ?? `Stage ${currentStage + 1}`,
        passedThresholds,
      };
      setSummaryStats(stats);
      setStatus("summary");
      if (mountedRef.current && onSessionComplete) onSessionComplete(stats);
    } else {
      setQuestionIndex(nextIndex);
      setLastCorrect(null);
      setUserAnswer(null);
      const q = getQuestionForStage(currentStage);
      setCurrentQuestion(q);
      questionShownAtRef.current = Date.now();
      setElapsedQuestionSeconds(0);
      setStatus("active");
    }
  }, [
    status,
    questionIndex,
    questionCount,
    responseTimesMs,
    correctCount,
    currentStage,
    onSessionComplete,
  ]);

  const goToNext = useCallback(() => {
    if (status !== "review") return;
    const nextIndex = questionIndex + 1;
    if (nextIndex >= questionCount) {
      const times = responseTimesMs;
      const avgTimeMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const correct = correctCount;
      const total = questionCount;
      const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const config = MENTAL_MATHS_STAGES[currentStage];
      const passedThresholds =
        accuracyPct >= (config?.requiredAccuracy ?? 80) &&
        avgTimeMs <= (config?.maxAvgTimeMs ?? 10000);
      if (passedThresholds && currentStage < MENTAL_MATHS_STAGES.length - 1) {
        setHighestUnlockedStage(currentStage + 1);
      }
      const stats: MentalMathsSummaryStats = {
        correct,
        total,
        accuracyPct,
        avgTimeMs,
        stageIndex: currentStage,
        stageName: config?.name ?? `Stage ${currentStage + 1}`,
        passedThresholds,
      };
      setSummaryStats(stats);
      setStatus("summary");
      if (mountedRef.current && onSessionComplete) onSessionComplete(stats);
    } else {
      setQuestionIndex(nextIndex);
      setLastCorrect(null);
      setUserAnswer(null);
      const q = getQuestionForStage(currentStage);
      setCurrentQuestion(q);
      questionShownAtRef.current = Date.now();
      setElapsedQuestionSeconds(0);
      setStatus("active");
    }
  }, [
    status,
    questionIndex,
    questionCount,
    responseTimesMs,
    correctCount,
    currentStage,
    onSessionComplete,
  ]);

  const backToIdle = useCallback(() => {
    setStatus("idle");
    setCurrentQuestion(null);
    setSummaryStats(null);
  }, []);

  return {
    status,
    currentStage,
    questionIndex,
    questionCount,
    correctCount,
    responseTimesMs,
    currentQuestion,
    userAnswer,
    lastCorrect,
    summaryStats,
    highestUnlocked,
    stageConfig,
    elapsedQuestionSeconds,
    startStage,
    submitExact,
    submitMcq,
    goToNext,
    skipQuestion,
    backToIdle,
  };
}
