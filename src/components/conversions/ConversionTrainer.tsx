import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { CONVERSION_QUESTIONS } from "../../data/conversionQuestions";
import type { ConversionQuestion } from "../../data/conversionQuestions";
import { fetchConversionDrill } from "../../lib/conversionTrainerApi";
import { saveConversionSession } from "../../utils/analyticsStorage";
import { newClientSessionId } from "../../lib/trainerSessionLog";

type AnswerRecord = {
  category: ConversionQuestion["category"];
  commonTrap: string;
  correct: boolean;
};

const AUTO_SAVE_INTERVAL = 5;

const COMMON_TRAP_COPY: Record<string, string> = {
  "answer-unit-mismatch": "Doing the calculation correctly but leaving the answer in the wrong unit.",
  "decimal-hours-read-as-minutes": "Treating a decimal number of hours as if the decimal part were minutes.",
  "decimal-minutes-read-as-seconds": "Treating a decimal number of minutes as if the decimal part were seconds.",
  "divided-instead-of-multiplied": "Dividing when the conversion needs multiplication, usually when moving to a smaller unit.",
  "linear-conversion-used-for-area": "Using the length conversion for an area conversion instead of squaring the conversion factor.",
  "minutes-used-as-hours": "Using minutes directly in a speed formula instead of converting them to hours first.",
  "multiplied-instead-of-divided": "Multiplying when the conversion needs division, usually when moving to a larger unit.",
  "pence-pounds-confusion": "Mixing pence and pounds, especially forgetting that 100p equals £1.",
  "per-unit-rate-multiplied-by-wrong-unit": "Applying a per-unit rate to the wrong unit or before checking the units match.",
  "rounded-too-early": "Rounding during the working instead of keeping the calculator value until the final answer.",
  "rounded-up-when-full-servings-required": "Rounding up when the question asks for complete portions only.",
  "speed-unit-conversion-reversed": "Reversing the km/h and m/s conversion, especially using ×3.6 and ÷3.6 the wrong way round.",
  "unnecessary-factor-of-1000": "Adding an unnecessary ×1000 or ÷1000 when the units are already equivalent.",
  "volume-unit-mismatch": "Confusing volume units such as litres, millilitres and cubic centimetres.",
  "wrong-denominator": "Using the wrong denominator for a rate, such as treating a per 100 value as a per 1 value.",
};

function normaliseAnswer(value: string): number | null {
  const match = value.match(/-?\d+(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function answersMatch(userAnswer: number, expected: number): boolean {
  return Math.abs(userAnswer - expected) < 0.01;
}

function scrollTrainerToTop() {
  const appScroll = document.getElementById("app-main-scroll");
  if (appScroll) {
    appScroll.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function createQuestionQueue(pool: ConversionQuestion[]): ConversionQuestion[] {
  const groups = new Map<ConversionQuestion["category"], ConversionQuestion[]>();
  for (const question of pool) {
    const current = groups.get(question.category) ?? [];
    current.push(question);
    groups.set(question.category, current);
  }

  for (const group of groups.values()) {
    for (let i = group.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  }

  const queue: ConversionQuestion[] = [];
  const categories = Array.from(groups.keys());
  while (queue.length < pool.length) {
    for (const category of categories) {
      const next = groups.get(category)?.pop();
      if (next) queue.push(next);
    }
  }

  return queue;
}

function buildCategoryStats(records: Record<string, AnswerRecord>) {
  return Object.values(records).reduce<Record<string, { correct: number; total: number }>>(
    (stats, record) => {
      const current = stats[record.category] ?? { correct: 0, total: 0 };
      current.total += 1;
      if (record.correct) current.correct += 1;
      stats[record.category] = current;
      return stats;
    },
    {},
  );
}

function buildTrapStats(records: Record<string, AnswerRecord>) {
  return Object.values(records).reduce<Record<string, number>>((stats, record) => {
    if (!record.correct) {
      stats[record.commonTrap] = (stats[record.commonTrap] ?? 0) + 1;
    }
    return stats;
  }, {});
}

function getCommonTrapCopy(trap: string): string {
  return COMMON_TRAP_COPY[trap] ?? trap.replace(/-/g, " ");
}

export default function ConversionTrainer() {
  const [questionPool, setQuestionPool] = useState<ConversionQuestion[]>(CONVERSION_QUESTIONS);
  const [questions, setQuestions] = useState<ConversionQuestion[]>(() =>
    createQuestionQueue(CONVERSION_QUESTIONS),
  );
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [savedAnswerCount, setSavedAnswerCount] = useState(0);
  const sessionStartedAtRef = useRef(0);
  const lastSavedAnswerCountRef = useRef(0);
  // One id per drill run: every checkpoint upserts the same cloud row.
  const clientSessionIdRef = useRef(newClientSessionId());

  useEffect(() => {
    sessionStartedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchConversionDrill()
      .then(({ questions: pool }) => {
        if (cancelled) return;
        if (pool.length >= 1) {
          setQuestionPool(pool);
          setQuestions(createQuestionQueue(pool));
          setIndex(0);
          setInput("");
          setSubmitted(false);
          setAnswers({});
          setSavedAnswerCount(0);
          lastSavedAnswerCountRef.current = 0;
          sessionStartedAtRef.current = Date.now();
          clientSessionIdRef.current = newClientSessionId();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const question = questions[index];
  const parsedAnswer = normaliseAnswer(input);
  const submittedAnswer = answers[question.id];
  const isCorrect = submitted && submittedAnswer?.correct === true;
  const isLast = index === questions.length - 1;
  const correctCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.correct).length,
    [answers],
  );
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const categoryStats = useMemo(() => buildCategoryStats(answers), [answers]);
  const weakestCategory = useMemo(() => {
    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total: stats.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0];
  }, [categoryStats]);
  const progress = useMemo(() => `${index + 1} of ${questions.length}`, [index, questions.length]);

  const saveSession = (records: Record<string, AnswerRecord>, options: { force?: boolean } = {}) => {
    const recordsList = Object.values(records);
    const nextSavedCount = recordsList.length;
    const shouldCheckpoint =
      options.force ||
      nextSavedCount === questions.length ||
      nextSavedCount % AUTO_SAVE_INTERVAL === 0;

    if (!shouldCheckpoint || nextSavedCount === 0 || nextSavedCount <= lastSavedAnswerCountRef.current) return;

    lastSavedAnswerCountRef.current = nextSavedCount;
    setSavedAnswerCount(nextSavedCount);

    void saveConversionSession({
      correct: recordsList.filter((record) => record.correct).length,
      total: recordsList.length,
      timeSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      categoryStats: buildCategoryStats(records),
      trapStats: buildTrapStats(records),
    }, clientSessionIdRef.current).then((saved) => {
      if (!saved) {
        lastSavedAnswerCountRef.current = Math.min(lastSavedAnswerCountRef.current, nextSavedCount - 1);
        setSavedAnswerCount(lastSavedAnswerCountRef.current);
      }
    });
  };

  const handleSubmit = () => {
    if (submitted || parsedAnswer == null) return;
    const correct = answersMatch(parsedAnswer, question.answer);
    const nextAnswers = {
      ...answers,
      [question.id]: {
        category: question.category,
        commonTrap: question.explanation.commonTrap,
        correct,
      },
    };
    setSubmitted(true);
    setAnswers(nextAnswers);
    saveSession(nextAnswers, { force: isLast });
  };

  const handleNext = () => {
    if (isLast) return;
    goToIndex(index + 1);
  };

  const goToIndex = (nextIndex: number) => {
    const nextQuestion = questions[nextIndex];
    const prior = answers[nextQuestion.id];
    setIndex(nextIndex);
    if (prior) {
      setSubmitted(true);
      setInput("");
    } else {
      setInput("");
      setSubmitted(false);
    }
    scrollTrainerToTop();
  };

  const handlePrevious = () => {
    if (index <= 0) return;
    goToIndex(index - 1);
  };

  const handleNextQuestion = () => {
    if (index >= questions.length - 1) return;
    goToIndex(index + 1);
  };

  const handleRestart = () => {
    setQuestions(createQuestionQueue(questionPool));
    setIndex(0);
    setInput("");
    setSubmitted(false);
    setAnswers({});
    lastSavedAnswerCountRef.current = 0;
    setSavedAnswerCount(0);
    sessionStartedAtRef.current = Date.now();
    clientSessionIdRef.current = newClientSessionId();
    scrollTrainerToTop();
  };

  if (loading || !question) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Loading conversion questions…
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={index === 0}
              aria-label="Previous question"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7rem] text-center">Question {progress}</span>
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={index >= questions.length - 1}
              aria-label="Next question"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            Score {correctCount}/{answeredCount}
          </span>
        </div>

        <div className="rounded-xl border border-border px-5 py-4 mb-5">
          <p className="text-xl font-semibold text-foreground">{question.prompt}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            disabled={submitted}
            inputMode="decimal"
            className="min-h-[48px] flex-1 rounded-xl border border-border px-4 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-secondary"
            placeholder="e.g. 3600 m or £4.20"
            aria-label="Answer"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitted || parsedAnswer == null}
            className="min-h-[48px] rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        </div>

        {submitted ? (
          <>
            <div className={`rounded-xl border px-5 py-4 mb-4 ${isCorrect ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"}`}>
              <p className={`font-semibold ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>
                {isCorrect ? "Correct!" : "Incorrect."} The answer was {question.answerLabel}.
              </p>
            </div>

            <div className="border-t border-border pt-4 mb-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Method</h3>
              <div className="space-y-2 text-sm text-foreground leading-relaxed">
                <p><span className="font-semibold text-foreground">Target:</span> {question.explanation.method.target}</p>
                <p><span className="font-semibold text-foreground">Convert:</span> {question.explanation.method.convert}</p>
                <p><span className="font-semibold text-foreground">Calculate:</span> {question.explanation.method.calculate}</p>
              </div>

              <div className="mt-4 space-y-3 text-sm leading-relaxed">
                <div>
                  <h3 className="font-semibold text-foreground">Exam shortcut</h3>
                  <p className="text-foreground mt-1">{question.explanation.examShortcut}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Sense check</h3>
                  <p className="text-foreground mt-1">{question.explanation.senseCheck}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Common trap</h3>
                  <p className="text-foreground mt-1">{getCommonTrapCopy(question.explanation.commonTrap)}</p>
                </div>
              </div>
            </div>

            {savedAnswerCount > 0 && savedAnswerCount === answeredCount && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 mb-4 text-sm text-emerald-900">
                <p className="font-semibold">Checkpoint logged to your dashboard.</p>
                {weakestCategory && weakestCategory.accuracy < 100 ? (
                  <p className="mt-1">
                    Current weak area: {weakestCategory.category} ({weakestCategory.accuracy}% across {weakestCategory.total} answered).
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {isLast ? (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="min-h-[48px] rounded-xl border border-border bg-white text-foreground font-semibold hover:bg-secondary inline-flex items-center justify-center gap-2 px-5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart conversions
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[48px] rounded-xl bg-primary px-5 text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  Next question
                </button>
              )}
              <button
                type="button"
                onClick={() => saveSession(answers, { force: true })}
                disabled={answeredCount === 0 || savedAnswerCount === answeredCount}
                className="min-h-[48px] rounded-xl border border-border bg-white px-5 text-foreground font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savedAnswerCount === answeredCount ? "Checkpoint saved" : "Finish and log now"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900 flex gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Set up the unit conversion before calculating. Most QR conversion errors come from using the right numbers in the wrong units.</p>
          </div>
        )}
      </div>
    </div>
  );
}
