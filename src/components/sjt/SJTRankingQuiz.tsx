import { useState } from "react";
import { CheckCircle2, XCircle, Trophy, ArrowDown, ExternalLink } from "lucide-react";
import type { SJTRankingQuestion, RankingAnswer } from "../../types/sjt";
import SJTDomainBadge from "./SJTDomainBadge";
import { cn } from "../../lib/cn";

type Phase = "answering" | "results";

type Props = {
  question: SJTRankingQuestion;
  onComplete: (score: number, total: number) => void;
};

function getRankLabel(rank: 1 | 2 | 3): string {
  if (rank === 1) return "Most appropriate";
  if (rank === 3) return "Least appropriate";
  return "Middle option";
}

export default function SJTRankingQuiz({ question, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("answering");
  const [answer, setAnswer] = useState<RankingAnswer>({ most: null, least: null });

  const mostItem = question.items.find((i) => i.rank === 1)!;
  const leastItem = question.items.find((i) => i.rank === 3)!;
  const canSubmit = answer.most !== null && answer.least !== null && answer.most !== answer.least;

  const mostCorrect = answer.most === mostItem.id;
  const leastCorrect = answer.least === leastItem.id;
  const score = (mostCorrect ? 1 : 0) + (leastCorrect ? 1 : 0);

  function handleSubmit() {
    setPhase("results");
    onComplete(score, 2);
  }

  function selectMost(id: string) {
    setAnswer((prev) => ({
      most: prev.most === id ? null : id,
      least: prev.least === id ? null : prev.least,
    }));
  }

  function selectLeast(id: string) {
    setAnswer((prev) => ({
      least: prev.least === id ? null : id,
      most: prev.most === id ? null : prev.most,
    }));
  }

  if (phase === "results") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-3",
              score === 2
                ? "bg-emerald-100 text-emerald-800"
                : score === 1
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            )}
          >
            {score} / 2 correct
          </div>
          <p className="text-xs text-slate-500">One mark for most appropriate · One mark for least appropriate</p>
        </div>

        {question.pivotInsight && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
              Key insight
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{question.pivotInsight}</p>
            {question.gmpRef && (
              <a
                href={question.gmpRef.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                {question.gmpRef.label}
              </a>
            )}
          </div>
        )}

        <div className="space-y-3">
          {[...question.items].sort((a, b) => a.rank - b.rank).map((item) => {
            const isMost = item.rank === 1;
            const isLeast = item.rank === 3;
            const userSelectedMost = answer.most === item.id;
            const userSelectedLeast = answer.least === item.id;
            const isCorrectMost = isMost && userSelectedMost;
            const isCorrectLeast = isLeast && userSelectedLeast;
            const isWrongMost = !isMost && userSelectedMost;
            const isWrongLeast = !isLeast && userSelectedLeast;
            const hasError = isWrongMost || isWrongLeast;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3",
                  item.rank === 1 ? "border-emerald-200 bg-emerald-50/60" : item.rank === 3 ? "border-red-100 bg-red-50/40" : "border-slate-200 bg-slate-50/60"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full",
                      item.rank === 1 ? "bg-emerald-200 text-emerald-800" : item.rank === 3 ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {getRankLabel(item.rank as 1 | 2 | 3)}
                  </span>
                  {(isCorrectMost || isCorrectLeast) && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                  )}
                  {hasError && (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" aria-hidden />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-800 leading-snug">{item.text}</p>
                {(userSelectedMost || userSelectedLeast) && (
                  <p className="text-xs text-slate-500">
                    You selected this as:{" "}
                    <span className="font-semibold text-slate-700">
                      {userSelectedMost ? "most appropriate" : "least appropriate"}
                    </span>
                  </p>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Why this is ranked {item.rank === 1 ? "first" : item.rank === 2 ? "second" : "last"}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scenario</p>
          <SJTDomainBadge domain={question.domain} />
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">{question.stem}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">
          Rank the appropriateness of the following responses.
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Select the <strong>most appropriate</strong> and <strong>least appropriate</strong> response.
        </p>

        <div className="space-y-3">
          {question.items.map((item) => {
            const isSelectedMost = answer.most === item.id;
            const isSelectedLeast = answer.least === item.id;
            const isDisabledMost = answer.most !== null && !isSelectedMost && answer.least === item.id;
            const isDisabledLeast = answer.least !== null && !isSelectedLeast && answer.most === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border bg-white p-4 transition-colors",
                  isSelectedMost ? "border-emerald-400 bg-emerald-50/60" : isSelectedLeast ? "border-red-300 bg-red-50/40" : "border-slate-200"
                )}
              >
                <p className="text-sm text-slate-800 mb-3 leading-snug">{item.text}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectMost(item.id)}
                    disabled={isDisabledMost}
                    className={cn(
                      "flex-1 min-h-[36px] rounded-lg text-xs font-semibold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400",
                      isSelectedMost
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    <Trophy className="w-3.5 h-3.5 inline mr-1" aria-hidden />
                    Most appropriate
                  </button>
                  <button
                    type="button"
                    onClick={() => selectLeast(item.id)}
                    disabled={isDisabledLeast}
                    className={cn(
                      "flex-1 min-h-[36px] rounded-lg text-xs font-semibold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-red-400",
                      isSelectedLeast
                        ? "bg-red-500 border-red-500 text-white"
                        : "border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    <ArrowDown className="w-3.5 h-3.5 inline mr-1" aria-hidden />
                    Least appropriate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {canSubmit ? "Submit ranking" : "Select most and least appropriate to continue"}
      </button>
    </div>
  );
}
