import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, ChevronRight } from "lucide-react";
import type { SJTRatingQuestion, SJTRating, SJTQuizProgress } from "../../types/sjt";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import {
  APPROPRIATENESS_RATINGS,
  IMPORTANCE_RATINGS,
  APPROPRIATENESS_LABELS,
  IMPORTANCE_LABELS,
  getAdjacentRating,
} from "../../types/sjt";
import { cn } from "../../lib/cn";
import QuestionMediaBlock from "../media/QuestionMediaBlock";

type ItemPhase = "rating" | "feedback";

type Props = {
  question: SJTRatingQuestion;
  onComplete: (score: number, total: number) => void;
  onProgress?: (progress: SJTQuizProgress) => void;
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

export default function SJTRatingQuiz({ question, onComplete, onProgress }: Props) {
  const [itemIndex, setItemIndex] = useState(0);
  const [itemPhase, setItemPhase] = useState<ItemPhase>("rating");
  const [selected, setSelected] = useState<SJTRating | null>(null);
  const [scores, setScores] = useState<(0 | 0.5 | 1)[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    const nextScores = [...scores, s];
    setScores(nextScores);
    onProgress?.({
      itemsAttempted: nextScores.length,
      itemsTotal: question.items.length,
      partialScore: nextScores.reduce<number>((a, b) => a + b, 0),
    });
    setItemPhase("feedback");
  }

  function handleNext() {
    if (isLastItem) {
      const allScores = [...scores];
      const total = allScores.reduce<number>((a, b) => a + b, 0);
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
  const progressPct = Math.round((itemIndex / question.items.length) * 100);

  return (
    <div className="space-y-4">

      {/* Progress — full width above both columns so cards align */}
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

      {/* 2-col on desktop: scenario left (sticky), item right */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

        {/* Left col: Scenario */}
        <div className="lg:sticky lg:top-4">
          <div className="rounded-xl border border-border bg-card shadow-sm p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scenario</p>
            <p className="text-sm text-foreground leading-relaxed">{question.stem}</p>
            <QuestionMediaBlock media={question.media} placement="stem" className="mt-4" />
          </div>
        </div>

        {/* Right col: Item + Action */}
        <div className="space-y-4">

          {/* Item card */}
          <div className={cn(
            "rounded-xl border p-5 space-y-4",
            itemPhase === "feedback"
              ? currentScore === 1
                ? "bg-training-success-muted border-training-success"
                : currentScore === 0.5
                ? "bg-amber-50 border-amber-200"
                : "bg-destructive-muted border-destructive"
              : "border-border bg-card shadow-sm"
          )}>
            <div className="flex items-start gap-2">
              {itemPhase === "feedback" && (
                <span className="shrink-0 mt-0.5">
                  {currentScore === 1 ? (
                    <CheckCircle2 className="w-5 h-5 text-training-success" aria-hidden />
                  ) : currentScore === 0.5 ? (
                    <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" aria-hidden />
                  )}
                </span>
              )}
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {question.type === "appropriateness"
                    ? "How appropriate is this response?"
                    : "How important is this consideration?"}
                </p>
                <p className="text-sm font-medium text-foreground leading-relaxed">{item.text}</p>
                <QuestionMediaBlock media={item.media} placement="question" className="mt-3" />
              </div>
            </div>

            {/* Rating buttons */}
            {itemPhase === "rating" && (
              <div className="space-y-2">
                {scale.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelect(r)}
                    aria-pressed={selected === r}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold",
                    currentScore === 1
                      ? "bg-green-100 text-green-800"
                      : currentScore === 0.5
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  )}>
                    {currentScore === 1 ? "Full marks" : currentScore === 0.5 ? "Half mark" : "Incorrect"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Your answer: <strong className="text-foreground">{userLabel}</strong>
                  </span>
                  {currentScore !== 1 && (
                    <span className="text-xs text-muted-foreground">
                      Correct: <strong className="text-foreground">{correctLabel}</strong>
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Why {correctLabel} is correct
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{item.rationale}</p>
                  </div>

                  {currentScore !== 1 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Other points
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

                  <div className="border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                    >
                      <span aria-hidden>🚩</span>
                      Report this question
                    </button>
                  </div>
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

      <QuestionFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        context={{
          trainerType: "sjt_appropriateness",
          questionKind: "sjt_rating",
          questionIdentifier: `sjt:${question.id}:${item.id}`,
          passageId: null,
          sessionId: null,
        }}
      />
    </div>
  );
}
