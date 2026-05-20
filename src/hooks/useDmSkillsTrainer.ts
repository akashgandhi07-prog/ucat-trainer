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
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<DmTrainerPhase>("intro");
  const [questions, setQuestions] = useState<DmTrainerQuestion[]>([]);
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

  const activeQuestions = retryMode ? retryQueue : questions;
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
    setPhase("drill");
    setCurrentIndex(0);
    setAnswersByIndex(questions.map(() => null));
    setSelected(null);
    setShowFeedback(false);
    setRetryMode(false);
    setRetryQueue([]);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
  }, [questions]);

  const submitAnswer = useCallback(
    (optionId: DmTrainerOptionId) => {
      if (!current || showFeedback) return;
      const correct = optionId === current.correctAnswer;
      setSelected(optionId);
      setShowFeedback(true);
      setAnswersByIndex((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          questionId: current.id,
          selected: optionId,
          correct,
          skillTag: current.skillTag,
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
    void persistDmTrainerSession(user?.id ?? null, summary, retryModeRef.current);
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
    setAnswersByIndex(queue.map(() => null));
    setSelected(null);
    setShowFeedback(false);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
  }, [answers, questions]);

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
