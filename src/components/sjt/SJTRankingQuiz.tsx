import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, ChevronRight } from "lucide-react";
import type { SJTRankingQuestion, RankingAnswer } from "../../types/sjt";
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

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

      {/* Left col: Scenario stays fixed on desktop */}
      <div className="lg:sticky lg:top-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scenario</p>
          <p className="text-sm text-foreground leading-relaxed">{question.stem}</p>
        </div>

        {/* Pivot insight on desktop (below scenario in left col) */}
        {phase === "results" && question.pivotInsight && (
          <div className="mt-4 hidden lg:block rounded-xl border border-border bg-secondary p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Key insight
            </p>
            <p className="text-sm text-foreground leading-relaxed">{question.pivotInsight}</p>
            {question.gmpRef && (
              <a
                href={question.gmpRef.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                GMC Good Medical Practice: {question.gmpRef.label}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Right col: Items + Action */}
      <div className="space-y-4">

        {phase === "results" ? (
          <>
            {/* Score */}
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-2xl font-bold text-foreground mb-1">{score} / 2</p>
              <p className="text-xs text-muted-foreground">
                One mark for most appropriate. One mark for least appropriate.
              </p>
            </div>

            {/* Item breakdown */}
            <div className="space-y-3">
              {[...question.items].sort((a, b) => a.rank - b.rank).map((item) => {
                const userSelectedMost = answer.most === item.id;
                const userSelectedLeast = answer.least === item.id;
                const isCorrect =
                  (item.rank === 1 && userSelectedMost) ||
                  (item.rank === 3 && userSelectedLeast);
                const isError =
                  (item.rank !== 1 && userSelectedMost) ||
                  (item.rank !== 3 && userSelectedLeast);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-4 space-y-3",
                      isCorrect
                        ? "bg-training-success-muted border-training-success"
                        : isError
                        ? "bg-destructive-muted border-destructive"
                        : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                        {getRankLabel(item.rank as 1 | 2 | 3)}
                      </span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-training-success shrink-0" aria-hidden />}
                      {isError && <XCircle className="w-4 h-4 text-destructive shrink-0" aria-hidden />}
                    </div>

                    <p className="text-sm font-medium text-foreground leading-snug">{item.text}</p>

                    {(userSelectedMost || userSelectedLeast) && (
                      <p className="text-xs text-muted-foreground">
                        You selected: <span className="font-semibold text-foreground">
                          {userSelectedMost ? "most appropriate" : "least appropriate"}
                        </span>
                      </p>
                    )}

                    <div className="rounded-lg bg-card border border-border p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Why ranked {item.rank === 1 ? "first" : item.rank === 2 ? "second" : "last"}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{item.rationale}</p>
                      {item.gmpRef && (
                        <a
                          href={item.gmpRef.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold mt-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                          GMC Good Medical Practice: {item.gmpRef.label}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pivot insight on mobile (below items) */}
            {question.pivotInsight && (
              <div className="lg:hidden rounded-xl border border-border bg-secondary p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Key insight
                </p>
                <p className="text-sm text-foreground leading-relaxed">{question.pivotInsight}</p>
                {question.gmpRef && (
                  <a
                    href={question.gmpRef.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold mt-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    GMC Good Medical Practice: {question.gmpRef.label}
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Select the most and least appropriate response.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                The middle option is not scored, but all three rationales will be shown after you submit.
              </p>

              <div className="space-y-3">
                {question.items.map((item) => {
                  const isSelectedMost = answer.most === item.id;
                  const isSelectedLeast = answer.least === item.id;
                  const disabledMost = answer.most !== null && !isSelectedMost && answer.least === item.id;
                  const disabledLeast = answer.least !== null && !isSelectedLeast && answer.most === item.id;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border bg-card p-4 transition-colors",
                        isSelectedMost || isSelectedLeast ? "border-primary" : "border-border"
                      )}
                    >
                      <p className="text-sm text-foreground mb-3 leading-snug">{item.text}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => selectMost(item.id)}
                          disabled={disabledMost}
                          className={cn(
                            "flex-1 min-h-[36px] rounded-lg text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                            isSelectedMost
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-card border-border text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                          )}
                        >
                          Most appropriate
                        </button>
                        <button
                          type="button"
                          onClick={() => selectLeast(item.id)}
                          disabled={disabledLeast}
                          className={cn(
                            "flex-1 min-h-[36px] rounded-lg text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                            isSelectedLeast
                              ? "bg-secondary border-primary text-foreground font-bold"
                              : "bg-card border-border text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                          )}
                        >
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
              className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {canSubmit ? (
                <>Submit ranking <ChevronRight className="w-4 h-4" aria-hidden /></>
              ) : (
                "Select most and least appropriate to continue"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
