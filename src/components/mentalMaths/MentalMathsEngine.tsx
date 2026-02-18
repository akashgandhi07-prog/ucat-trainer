import { useState, useCallback, useRef, useEffect } from "react";
import { useMentalMathsLogic } from "../../hooks/useMentalMathsLogic";
import type { MentalMathsSummaryStats } from "../../hooks/useMentalMathsLogic";
import { MENTAL_MATHS_STAGES } from "./mentalMathsStages";

const SUBMIT_LOCK_MS = 300;

interface MentalMathsEngineProps {
  onSessionComplete?: (stats: MentalMathsSummaryStats) => void;
  onStageStart?: (stageIndex: number) => void;
}

export function MentalMathsEngine({ onSessionComplete, onStageStart }: MentalMathsEngineProps) {
  const logic = useMentalMathsLogic(onSessionComplete);
  const [exactInput, setExactInput] = useState("");
  const [submitLocked, setSubmitLocked] = useState(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exactInputRef = useRef<HTMLInputElement>(null);
  const reviewShownAtRef = useRef<number>(0);

  const lockSubmit = useCallback(() => {
    setSubmitLocked(true);
    if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    lockTimeoutRef.current = setTimeout(() => {
      setSubmitLocked(false);
      lockTimeoutRef.current = null;
    }, SUBMIT_LOCK_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    };
  }, []);

  // Clear input when starting a stage or advancing to next question (avoid setState-in-effect)
  const handleStageStart = useCallback((stageIndex: number) => {
    setExactInput("");
    logic.startStage(stageIndex);
    onStageStart?.(stageIndex);
  }, [logic, onStageStart]);
  const handleGoToNext = useCallback(() => {
    setExactInput("");
    logic.goToNext();
  }, [logic]);

  // Auto-focus answer input on each new exact-answer question so user can type immediately
  useEffect(() => {
    if (logic.status === "active" && logic.currentQuestion?.kind === "exact") {
      exactInputRef.current?.focus();
    }
  }, [logic.status, logic.questionIndex, logic.currentQuestion?.kind]);

  // Enter (or Space) on review advances to next question — ignore for 400ms so the submit Enter doesn’t skip feedback
  useEffect(() => {
    if (logic.status !== "review") return;
    reviewShownAtRef.current = Date.now();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (Date.now() - reviewShownAtRef.current < 400) return;
      e.preventDefault();
      handleGoToNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logic.status, handleGoToNext]);

  const handleSubmitExact = useCallback(() => {
    if (submitLocked || logic.status !== "active") return;
    const parsed = parseFloat(exactInput);
    if (Number.isNaN(parsed)) return;
    logic.submitExact(parsed);
    lockSubmit();
  }, [submitLocked, logic, exactInput, lockSubmit]);

  const handleSubmitMcq = useCallback(
    (index: number) => {
      if (submitLocked || logic.status !== "active") return;
      logic.submitMcq(index);
      lockSubmit();
    },
    [submitLocked, logic, lockSubmit]
  );

  const sanitiseNumericInput = useCallback((raw: string): string => {
    const hasDot = raw.includes(".");
    let out = raw.replace(/[^0-9.]/g, "");
    if (hasDot) {
      const parts = out.split(".");
      if (parts.length > 2) out = parts[0] + "." + parts.slice(1).join("");
      else if (parts.length === 2 && parts[1].length > 2) out = parts[0] + "." + parts[1].slice(0, 2);
    } else if (out.includes(".")) {
      const [a, b] = out.split(".");
      out = b ? a + "." + b.slice(0, 2) : a;
    }
    return out;
  }, []);

  const handleExactKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitExact();
        return;
      }
      if (/[0-9.]/.test(e.key) || e.key === "Backspace" || e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight") return;
      e.preventDefault();
    },
    [handleSubmitExact]
  );

  const handleExactPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const raw = e.clipboardData.getData("text");
      const sanitised = sanitiseNumericInput(raw);
      if (sanitised !== "" || raw === "") setExactInput(sanitised);
    },
    [sanitiseNumericInput]
  );

  if (logic.status === "idle") {
    return (
      <div className="p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Choose a stage</h2>
        <div className="space-y-2">
          {MENTAL_MATHS_STAGES.map((stage, i) => {
            const unlocked = i <= logic.highestUnlocked;
            const prevStage = i > 0 ? MENTAL_MATHS_STAGES[i - 1] : null;
            const unlockHint = !unlocked && prevStage
              ? `Complete ${prevStage.name} with ${prevStage.requiredAccuracy}% accuracy and under ${(prevStage.maxAvgTimeMs / 1000).toFixed(0)}s per question`
              : null;
            return (
              <div key={stage.id} className="space-y-1">
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => handleStageStart(i)}
                  className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors min-h-[52px] ${
                    unlocked
                      ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-900"
                      : "border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <span className="font-medium">{stage.name}</span>
                  {unlocked ? (
                    <span className="text-sm text-indigo-600 font-medium">Start →</span>
                  ) : (
                    <span className="text-xs">Locked</span>
                  )}
                </button>
                {unlockHint && (
                  <p className="text-xs text-slate-500 pl-1">{unlockHint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Inline review: same layout as active (timer, progress, question) + compact feedback and auto-advance
  if (logic.status === "review") {
    const q = logic.currentQuestion;
    const correct = logic.lastCorrect === true;
    const answerLabel =
      q && q.kind === "exact"
        ? (typeof q.answer === "number" && q.answer % 1 !== 0 ? q.answer.toFixed(2) : String(q.answer))
        : q && q.kind === "mcq"
          ? String(q.options[q.correctIndex].toLocaleString())
          : "";
    const answerLine = answerLabel ? ` The answer was ${answerLabel}.` : "";

    const isLast = logic.questionIndex + 1 >= logic.questionCount;

    return (
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span className="text-sm font-medium text-slate-500">
            Question {logic.questionIndex + 1} of {logic.questionCount}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular-nums text-slate-700">
            Took {logic.elapsedQuestionSeconds}s
          </span>
        </div>
        {q && (
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-5 py-4 mb-4">
            <p className="text-xl font-semibold text-slate-900">{q.prompt}</p>
          </div>
        )}
        <div className={`rounded-xl border px-5 py-4 mb-4 ${correct ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"}`}>
          <p className={`font-semibold ${correct ? "text-emerald-800" : "text-rose-800"}`}>
            {correct ? `Correct!${answerLine}` : `Incorrect.${answerLine}`}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Score: {logic.correctCount} / {logic.questionIndex + 1} — press Enter or click below
          </p>
        </div>
        <button
          type="button"
          onClick={handleGoToNext}
          className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isLast ? "See summary" : "Next question"}
        </button>
      </div>
    );
  }

  if (logic.status === "summary" && logic.summaryStats) {
    const s = logic.summaryStats;
    const canTryNextStage = s.passedThresholds && s.stageIndex < MENTAL_MATHS_STAGES.length - 1;
    return (
      <div className="p-5 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Session complete</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.correct} / {s.total}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Score</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.accuracyPct}%</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Accuracy</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{Math.round(s.avgTimeMs / 1000)}s</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Avg per question</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-base font-bold text-slate-900">{s.stageName}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Stage</p>
          </div>
        </div>
        {s.passedThresholds && (
          <p className="text-sm text-emerald-700 font-medium mb-6">You met the targets. Next stage is unlocked!</p>
        )}
        <div className="flex flex-col gap-3">
          {canTryNextStage && (
            <button
              type="button"
              onClick={() => handleStageStart(s.stageIndex + 1)}
              className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Next stage →
            </button>
          )}
          <button
            type="button"
            onClick={() => handleStageStart(s.stageIndex)}
            className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            Try again (same stage)
          </button>
          <button
            type="button"
            onClick={logic.backToIdle}
            className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2"
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  if (logic.status === "active" && logic.currentQuestion) {
    const q = logic.currentQuestion;

    if (q.kind === "exact") {
      const progressPct = (logic.questionIndex + 1) / logic.questionCount * 100;
      return (
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <span className="text-sm font-medium text-slate-500">
              Question {logic.questionIndex + 1} of {logic.questionCount}
            </span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular-nums text-slate-700">
                {Math.floor(logic.elapsedQuestionSeconds / 60)}:{String(logic.elapsedQuestionSeconds % 60).padStart(2, "0")}
              </span>
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-5 py-6 mb-6">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{q.prompt}</p>
          </div>
          <div className="mb-6">
            <input
              ref={exactInputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={exactInput}
              onChange={(e) => setExactInput(sanitiseNumericInput(e.target.value))}
              onKeyDown={handleExactKeyDown}
              onPaste={handleExactPaste}
              placeholder="Your answer"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-shadow"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={logic.backToIdle}
              className="min-h-[48px] px-4 rounded-xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              Back
            </button>
            <button
              type="button"
              onClick={logic.skipQuestion}
              className="min-h-[48px] px-4 rounded-xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={submitLocked || exactInput === ""}
              onClick={handleSubmitExact}
              className="min-h-[48px] flex-1 min-w-[140px] rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Submit
            </button>
          </div>
        </div>
      );
    }

    const progressPct = (logic.questionIndex + 1) / logic.questionCount * 100;
    return (
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span className="text-sm font-medium text-slate-500">
            Question {logic.questionIndex + 1} of {logic.questionCount}
          </span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular-nums text-slate-700">
              {Math.floor(logic.elapsedQuestionSeconds / 60)}:{String(logic.elapsedQuestionSeconds % 60).padStart(2, "0")}
            </span>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-5 py-5 mb-6">
          <p className="text-base sm:text-lg font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">{q.prompt}</p>
        </div>
        <div className="space-y-2 mb-6">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={submitLocked}
              onClick={() => handleSubmitMcq(i)}
              className="w-full min-h-[52px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 font-medium hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              {opt.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={logic.backToIdle}
            className="min-h-[48px] px-4 rounded-xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={logic.skipQuestion}
            className="min-h-[48px] px-4 rounded-xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-center text-slate-600">
      <p>Loading…</p>
    </div>
  );
}
