import { useState, useCallback, useRef, useEffect } from "react";
import { useMentalMathsLogic } from "../../hooks/useMentalMathsLogic";
import type { MentalMathsSummaryStats } from "../../hooks/useMentalMathsLogic";
import { MENTAL_MATHS_STAGES } from "./mentalMathsStages";
import { PostDrillUpsell } from "../layout/ProductUpsell";
import { CheckCircle2, Lock, Trophy } from "lucide-react";

const SUBMIT_LOCK_MS = 300;

function scrollTrainerToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function formatAvgTime(ms: number): string {
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

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

  const handleStageStart = useCallback((stageIndex: number) => {
    scrollTrainerToTop();
    setExactInput("");
    logic.startStage(stageIndex);
    onStageStart?.(stageIndex);
  }, [logic, onStageStart]);

  const handleGoToNext = useCallback(() => {
    scrollTrainerToTop();
    setExactInput("");
    logic.goToNext();
  }, [logic]);

  // Auto-focus answer input on each new exact-answer question
  useEffect(() => {
    if (logic.status === "active" && logic.currentQuestion?.kind === "exact") {
      exactInputRef.current?.focus();
    }
  }, [logic.status, logic.questionIndex, logic.currentQuestion?.kind]);

  // Enter (or Space) on review advances to next question — ignore for 400ms so the submit Enter doesn't skip feedback
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

  // ─── Idle: stage selector ──────────────────────────────────────────────────

  if (logic.status === "idle") {
    return (
      <div className="p-5 sm:p-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Choose a stage</h2>
        <div className="space-y-2.5">
          {MENTAL_MATHS_STAGES.map((stage, i) => {
            const unlocked = i <= logic.highestUnlocked;
            const pb = logic.personalBests[i];
            const prevStage = i > 0 ? MENTAL_MATHS_STAGES[i - 1] : null;
            const unlockHint = !unlocked && prevStage
              ? `Complete ${prevStage.name} with ${prevStage.requiredAccuracy}% accuracy and under ${(prevStage.maxAvgTimeMs / 1000).toFixed(0)}s per question`
              : null;
            const targetTime = (stage.maxAvgTimeMs / 1000).toFixed(0);

            return (
              <div key={stage.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => handleStageStart(i)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                    unlocked
                      ? "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-900 shadow-sm hover:shadow"
                      : "border-slate-100 bg-slate-50/60 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {/* Icon column */}
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    pb
                      ? "bg-emerald-100 text-emerald-700"
                      : unlocked
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-400"
                  }`}>
                    {pb ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </span>

                  {/* Text column */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm leading-tight ${unlocked ? "text-slate-900" : "text-slate-400"}`}>
                      {stage.name}
                    </p>
                    {pb ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Best: <span className="font-semibold text-emerald-700">{formatAvgTime(pb.avgTimeMs)}</span> avg
                        {" · "}target: beat <span className="font-medium">{targetTime}s</span>
                      </p>
                    ) : unlocked ? (
                      <p className="text-xs text-slate-400 mt-0.5">Target: {stage.requiredAccuracy}% accuracy · under {targetTime}s avg</p>
                    ) : null}
                  </div>

                  {/* Right action */}
                  {unlocked ? (
                    <span className="flex-shrink-0 text-sm font-semibold text-indigo-600 whitespace-nowrap">
                      {pb ? "Retry →" : "Start →"}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-xs text-slate-400">Locked</span>
                  )}
                </button>
                {unlockHint && (
                  <p className="text-xs text-slate-400 mt-1 pl-1">{unlockHint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Review: inline feedback ───────────────────────────────────────────────

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
            Score: {logic.correctCount} / {logic.questionIndex + 1} · press Enter or click below
          </p>
        </div>
        <button
          type="button"
          onClick={handleGoToNext}
          className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isLast ? "See summary" : "Next question"}
        </button>
      </div>
    );
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  if (logic.status === "summary" && logic.summaryStats) {
    const s = logic.summaryStats;
    const canTryNextStage = s.passedThresholds && s.stageIndex < MENTAL_MATHS_STAGES.length - 1;
    const stageConfig = MENTAL_MATHS_STAGES[s.stageIndex];
    const targetAvgS = stageConfig ? (stageConfig.maxAvgTimeMs / 1000).toFixed(0) : "—";
    const actualAvgS = formatAvgTime(s.avgTimeMs);

    return (
      <div className="p-5 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Session complete</h2>
          {s.isNewPersonalBest && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Trophy className="w-3.5 h-3.5" /> New personal best!
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.correct} / {s.total}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Score</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.accuracyPct}%</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Accuracy</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-bold ${s.passedThresholds ? "text-emerald-700" : "text-slate-900"}`}>
              {actualAvgS}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Avg per question</p>
            <p className="text-xs text-slate-400 mt-0.5">target: &lt;{targetAvgS}s</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-base font-bold text-slate-900">{s.stageName}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Stage</p>
          </div>
        </div>
        {s.passedThresholds && (
          <p className="text-sm text-emerald-700 font-medium mb-5">
            {s.isNewPersonalBest ? "New personal best — you've never been faster on this stage!" : "Targets met — nice work!"}
            {canTryNextStage && " Next stage is now unlocked."}
          </p>
        )}
        {!s.passedThresholds && (
          <p className="text-sm text-slate-500 mb-5">
            Keep practising — you need {stageConfig?.requiredAccuracy ?? 80}% accuracy and under {targetAvgS}s avg to unlock the next stage.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {canTryNextStage && (
            <button
              type="button"
              onClick={() => handleStageStart(s.stageIndex + 1)}
              className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
            className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2"
          >
            Back to menu
          </button>
        </div>
        <PostDrillUpsell accuracy={s.accuracyPct} />
      </div>
    );
  }

  // ─── Active: question display ──────────────────────────────────────────────

  if (logic.status === "active" && logic.currentQuestion) {
    const q = logic.currentQuestion;
    const progressPct = (logic.questionIndex + 1) / logic.questionCount * 100;

    const header = (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <span className="text-sm font-medium text-slate-500">
          Question {logic.questionIndex + 1} of {logic.questionCount}
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular-nums text-slate-700">
            {Math.floor(logic.elapsedQuestionSeconds / 60)}:{String(logic.elapsedQuestionSeconds % 60).padStart(2, "0")}
          </span>
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    );

    const backSkip = (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={logic.backToIdle}
          className="min-h-[44px] px-4 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={logic.skipQuestion}
          className="min-h-[44px] px-4 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
        >
          Skip
        </button>
      </div>
    );

    if (q.kind === "exact") {
      return (
        <div className="p-5 sm:p-8">
          {header}
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-5 py-6 mb-6">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{q.prompt}</p>
          </div>
          <div className="mb-5">
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
            {backSkip}
            <button
              type="button"
              disabled={submitLocked || exactInput === ""}
              onClick={handleSubmitExact}
              className="min-h-[44px] flex-1 min-w-[140px] rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Submit
            </button>
          </div>
        </div>
      );
    }

    // MCQ
    return (
      <div className="p-5 sm:p-8">
        {header}
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-5 py-5 mb-5">
          <p className="text-base sm:text-lg font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">{q.prompt}</p>
        </div>
        <div className="space-y-2 mb-5">
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
        {backSkip}
      </div>
    );
  }

  return (
    <div className="p-6 text-center text-slate-600">
      <p>Loading…</p>
    </div>
  );
}
