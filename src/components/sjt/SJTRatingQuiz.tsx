import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, ChevronRight } from "lucide-react";
import type { SJTRatingQuestion, SJTRating } from "../../types/sjt";
import {
  APPROPRIATENESS_RATINGS,
  IMPORTANCE_RATINGS,
  APPROPRIATENESS_LABELS,
  IMPORTANCE_LABELS,
  getAdjacentRating,
} from "../../types/sjt";
import { cn } from "../../lib/cn";

type ItemPhase = "rating" | "feedback";

type Props = {
  question: SJTRatingQuestion;
  onComplete: (score: number, total: number) => void;
};

function getRatingScale(type: "appropriateness" | "importance"): SJTRating[] {
  return type === "appropriateness" ? APPROPRIATENESS_RATINGS : IMPORTANCE_RATINGS;
}

function getLabelMap(type: "appropriateness" | "importance"): Record<string, string> {
  return type === "appropriateness" ? APPROPRIATENESS_LABELS : IMPORTANCE_LABELS;
}

function scoreItem(
  userRating: SJTRating,
  correct: SJTRating,
  type: "appropriateness" | "importance"
): 0 | 0.5 | 1 {
  if (userRating === correct) return 1;
  if (getAdjacentRating(correct, type) === userRating) return 0.5;
  return 0;
}

export default function SJTRatingQuiz({ question, onComplete }: Props) {
  const [itemIndex, setItemIndex] = useState(0);
  const [itemPhase, setItemPhase] = useState<ItemPhase>("rating");
  const [selected, setSelected] = useState<SJTRating | null>(null);
  const [scores, setScores] = useState<(0 | 0.5 | 1)[]>([]);

  const scale = getRatingScale(question.type);
  const labelMap = getLabelMap(question.type);
  const item = question.items[itemIndex];
  const isLastItem = itemIndex === question.items.length - 1;

  function handleSelect(rating: SJTRating) {
    if (itemPhase === "feedback") return;
    setSelected(rating);
  }

  function handleConfirm() {
    if (!selected) return;
    const s = scoreItem(selected, item.correctRating, question.type);
    setScores((prev) => [...prev, s]);
    setItemPhase("feedback");
  }

  function handleNext() {
    if (isLastItem) {
      const total = scores.reduce<number>((sum, s) => sum + s, 0);
      onComplete(total, question.items.length);
    } else {
      setItemIndex((i) => i + 1);
      setItemPhase("rating");
      setSelected(null);
    }
  }

  const currentScore = selected && itemPhase === "feedback"
    ? scoreItem(selected, item.correctRating, question.type)
    : null;

  const correctLabel = labelMap[item.correctRating];
  const userLabel = selected ? labelMap[selected] : null;
  const nextBestRating = getAdjacentRating(item.correctRating, question.type);
  const nextBestLabel = nextBestRating ? labelMap[nextBestRating] : null;
  const progressPct = Math.round(((itemIndex + 1) / question.items.length) * 100);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Item {itemIndex + 1} of {question.items.length}</span>
          <span>{question.items.length - itemIndex - 1} remaining</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:gap-5 xl:gap-6 lg:items-start space-y-3 lg:space-y-0">
        <div className="lg:self-start">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 sm:p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scenario</p>
            <p className="text-sm text-foreground leading-relaxed lg:text-[15px]">{question.stem}</p>
          </div>
        </div>

        <div className="space-y-3">
        {/* Item card */}
        <div className={cn(
          "rounded-xl border p-4 sm:p-5 space-y-4",
          itemPhase === "feedback"
            ? currentScore === 1
              ? "bg-training-success-muted border-training-success"
              : currentScore === 0.5
              ? "bg-warning-muted border-warning"
              : "bg-destructive-muted border-destructive"
            : "border-border bg-card shadow-sm"
        )}>
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 w-5">
              {itemPhase === "feedback" && (
                <>
                {currentScore === 1 ? (
                  <CheckCircle2 className="w-5 h-5 text-training-success" aria-hidden />
                ) : currentScore === 0.5 ? (
                  <AlertCircle className="w-5 h-5 text-warning" aria-hidden />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" aria-hidden />
                )}
                </>
              )}
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {question.type === "appropriateness"
                  ? "How appropriate is this response?"
                  : "How important is this consideration?"}
              </p>
              <p className="text-sm font-semibold text-foreground leading-relaxed lg:text-[15px]">{item.text}</p>
            </div>
          </div>

          {/* Rating buttons */}
          {itemPhase === "rating" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {scale.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelect(r)}
                  aria-pressed={selected === r}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                    selected === r
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-foreground hover:bg-secondary"
                  )}
                >
                  {labelMap[r]}
                </button>
              ))}
            </div>
          )}

          {/* Feedback */}
          {itemPhase === "feedback" && selected && (
            <div className="space-y-3">
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:items-center">
                <span className={cn(
                  "w-fit px-2.5 py-1 rounded-full font-semibold",
                  currentScore === 1
                    ? "bg-training-success-muted text-training-success"
                    : currentScore === 0.5
                    ? "bg-warning-muted text-warning"
                    : "bg-destructive-muted text-destructive"
                )}>
                  {currentScore === 1 ? "Full mark" : currentScore === 0.5 ? "Half mark" : "Incorrect"}
                </span>
                <span>
                  Your answer: <strong className="text-foreground">{userLabel}</strong>
                </span>
                {currentScore !== 1 && (
                  <span className="sm:col-start-2">
                    Correct: <strong className="text-foreground">{correctLabel}</strong>
                  </span>
                )}
                {currentScore !== 1 && nextBestLabel && (
                  <span className="sm:col-start-2">
                    Next best for 0.5 marks: <strong className="text-foreground">{nextBestLabel}</strong>
                  </span>
                )}
              </div>

              <div className="rounded-lg bg-card border border-border p-4 space-y-3 lg:max-h-[min(36vh,24rem)] lg:overflow-y-auto">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Why {correctLabel} is correct
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{item.rationale}</p>
                </div>

                {currentScore !== 1 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Why not {userLabel}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{item.whyNotAdjacent}</p>
                  </div>
                )}

                {item.gmpRef && (
                  <div className="border-t border-border pt-3">
                    <a
                      href={item.gmpRef.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                      GMC Good Medical Practice: {item.gmpRef.label}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pivot insight on last item */}
        {itemPhase === "feedback" && isLastItem && question.pivotInsight && (
          <div className="rounded-xl border border-border bg-secondary p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Key insight for this scenario
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

        {/* Action */}
        {itemPhase === "rating" ? (
          <button
            type="button"
            disabled={!selected}
            onClick={handleConfirm}
            className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
          >
            {isLastItem ? "See results" : "Next item"}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
