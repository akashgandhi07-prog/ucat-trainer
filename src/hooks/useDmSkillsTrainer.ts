import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { fetchDmTrainerDrill } from "../lib/dmTrainerApi";
import { persistDmTrainerSession } from "../lib/dmTrainerSessionStorage";
import type {
  DmTrainerOptionId,
  DmTrainerQuestion,
  DmTrainerSessionAnswer,
  DmTrainerType,
} from "../types/dmTrainers";
import { getDmTrainerConfig } from "../data/dmTrainers/trainerConfig";

export type DmTrainerPhase = "intro" | "drill" | "results";

export function useDmSkillsTrainer(trainerType: DmTrainerType) {
  const config = getDmTrainerConfig(trainerType);
  const { user } = useAuth();

  const [phase, setPhase] = useState<DmTrainerPhase>("intro");
  const [questions, setQuestions] = useState<DmTrainerQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionSource, setQuestionSource] = useState<"supabase" | "local" | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<DmTrainerSessionAnswer[]>([]);
  const [selected, setSelected] = useState<DmTrainerOptionId | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [retryMode, setRetryMode] = useState(false);
  const [retryQueue, setRetryQueue] = useState<DmTrainerQuestion[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryModeRef = useRef(false);

  const activeQuestions = retryMode ? retryQueue : questions;
  const current = activeQuestions[currentIndex] ?? null;
  const total = activeQuestions.length;
  const correctCount = answers.filter((a) => a.correct).length;

  useEffect(() => {
    retryModeRef.current = retryMode;
  }, [retryMode]);

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
    void loadQuestions();
  }, [loadQuestions]);

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
    setPhase("drill");
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    setShowFeedback(false);
    setRetryMode(false);
    setRetryQueue([]);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
  }, [questions.length]);

  const submitAnswer = useCallback(
    (optionId: DmTrainerOptionId) => {
      if (!current || showFeedback) return;
      const correct = optionId === current.correctAnswer;
      setSelected(optionId);
      setShowFeedback(true);
      setAnswers((prev) => [
        ...prev,
        {
          questionId: current.id,
          selected: optionId,
          correct,
          skillTag: current.skillTag,
        },
      ]);
    },
    [current, showFeedback],
  );

  const goToNext = useCallback(() => {
    if (!showFeedback) return;
    const isLast = currentIndex >= total - 1;
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowFeedback(false);
      return;
    }

    setAnswers((prev) => {
      const summary = {
        trainerType,
        correct: prev.filter((a) => a.correct).length,
        total: prev.length,
        elapsedSeconds,
        answers: prev,
        completedAt: new Date().toISOString(),
      };
      void persistDmTrainerSession(user?.id ?? null, summary, retryModeRef.current);
      return prev;
    });
    setPhase("results");
  }, [showFeedback, currentIndex, total, trainerType, elapsedSeconds, user?.id]);

  const restartDrill = useCallback(() => {
    startDrill();
  }, [startDrill]);

  const retryIncorrect = useCallback(() => {
    const incorrectIds = new Set(answers.filter((a) => !a.correct).map((a) => a.questionId));
    const queue = questions.filter((q) => incorrectIds.has(q.id));
    if (queue.length === 0) return;
    setRetryMode(true);
    setRetryQueue(queue);
    setPhase("drill");
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    setShowFeedback(false);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
  }, [answers, questions]);

  const backToIntro = useCallback(() => {
    setPhase("intro");
    setCurrentIndex(0);
    setAnswers([]);
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
    correctCount,
    incorrectCount,
    retryMode,
    startDrill,
    submitAnswer,
    goToNext,
    restartDrill,
    retryIncorrect,
    backToIntro,
  };
}
