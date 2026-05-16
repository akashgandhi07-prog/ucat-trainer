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

function getRatingLabelMap(type: "appropriateness" | "importance"): Record<string, string> {
  return type === "appropriateness" ? APPROPRIATENESS_LABELS : IMPORTANCE_LABELS;
}

function scoreItem(
  userRating: SJTRating,
  correct: SJTRating,
  type: "appropriateness" | "importance"
): 0 | 1 | 2 {
  if (userRating === correct) return 2;
  if (getAdjacentRating(correct, type) === userRating) return 1;
  return 0;
}

function ratingBtnClass(
  rating: SJTRating,
  selected: SJTRating | null,
  type: "appropriateness" | "importance"
): string {
  const base =
    "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary";
  const isSelected = selected === rating;

  if (type === "appropriateness") {
    if (rating === "very_appropriate")
      return cn(base, isSelected ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white");
    if (rating === "appropriate")
      return cn(base, isSelected ? "bg-emerald-400 border-emerald-400 text-white shadow-sm" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white");
    if (rating === "inappropriate")
      return cn(base, isSelected ? "bg-red-400 border-red-400 text-white shadow-sm" : "border-red-200 text-red-600 hover:bg-red-50 bg-white");
    return cn(base, isSelected ? "bg-red-600 border-red-600 text-white shadow-sm" : "border-red-300 text-red-700 hover:bg-red-50 bg-white");
  } else {
    if (rating === "very_important")
      return cn(base, isSelected ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-blue-300 text-blue-700 hover:bg-blue-50 bg-white");
    if (rating === "important")
      return cn(base, isSelected ? "bg-blue-400 border-blue-400 text-white shadow-sm" : "border-blue-200 text-blue-600 hover:bg-blue-50 bg-white");
    if (rating === "minor_importance")
      return cn(base, isSelected ? "bg-slate-400 border-slate-400 text-white shadow-sm" : "border-slate-300 text-slate-600 hover:bg-slate-50 bg-white");
    return cn(base, isSelected ? "bg-slate-600 border-slate-600 text-white shadow-sm" : "border-slate-300 text-slate-500 hover:bg-slate-50 bg-white");
  }
}

export default function SJTRatingQuiz({ question, onComplete }: Props) {
  const [itemIndex, setItemIndex] = useState(0);
  const [itemPhase, setItemPhase] = useState<ItemPhase>("rating");
  const [selected, setSelected] = useState<SJTRating | null>(null);
  const [scores, setScores] = useState<(0 | 1 | 2)[]>([]);

  const scale = getRatingScale(question.type);
  const labelMap = getRatingLabelMap(question.type);
  const item = question.items[itemIndex];
  const isLastItem = itemIndex === question.items.length - 1;

  function handleSelect(rating: SJTRating) {
    if (itemPhase === "feedback") return;
    setSelected(rating);
  }

  function handleSubmitItem() {
    if (!selected) return;
    const s = scoreItem(selected, item.correctRating, question.type);
    setScores((prev) => [...prev, s]);
    setItemPhase("feedback");
  }

  function handleNext() {
    if (isLastItem) {
      const total = [...scores].reduce((a, b) => a + b, 0);
      onComplete(total, question.items.length * 2);
    } else {
      setItemIndex((i) => i + 1);
      setItemPhase("rating");
      setSelected(null);
    }
  }

  const currentScore = selected ? scoreItem(selected, item.correctRating, question.type) : null;
  const correctLabel = labelMap[item.correctRating];
  const userLabel = selected ? labelMap[selected] : null;

  const progressPct = Math.round((itemIndex / question.items.length) * 100);

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Item {itemIndex + 1} of {question.items.length}</span>
          <span>{question.items.length - itemIndex - 1} remaining</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scenario (always visible) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Scenario</p>
        <p className="text-sm text-slate-800 leading-relaxed">{question.stem}</p>
      </div>

      {/* Current item */}
      <div className={cn(
        "rounded-xl border p-5 space-y-4",
        itemPhase === "feedback"
          ? currentScore === 2
            ? "border-emerald-200 bg-emerald-50/50"
            : currentScore === 1
            ? "border-amber-200 bg-amber-50/50"
            : "border-red-200 bg-red-50/50"
          : "border-slate-200 bg-white shadow-sm"
      )}>
        {/* Item header */}
        <div className="flex items-start gap-2">
          {itemPhase === "feedback" && (
            <span className="shrink-0 mt-0.5">
              {currentScore === 2 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden />
              ) : currentScore === 1 ? (
                <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" aria-hidden />
              )}
            </span>
          )}
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {question.type === "appropriateness" ? "How appropriate is this response?" : "How important is this consideration?"}
            </p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{item.text}</p>
          </div>
        </div>

        {/* Rating buttons (shown while rating, locked in feedback) */}
        {itemPhase === "rating" && (
          <div className="space-y-2">
            {scale.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSelect(r)}
                className={ratingBtnClass(r, selected, question.type)}
                aria-pressed={selected === r}
              >
                {labelMap[r]}
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {itemPhase === "feedback" && selected && (
          <div className="space-y-3">
            {/* Score badge + answer summary */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold",
                currentScore === 2 ? "bg-emerald-200 text-emerald-800"
                  : currentScore === 1 ? "bg-amber-200 text-amber-800"
                  : "bg-red-200 text-red-800"
              )}>
                {currentScore === 2 ? "Full marks" : currentScore === 1 ? "Partial credit" : "Incorrect"}
              </span>
              <span className="text-slate-500 text-xs">
                Your answer: <strong className="text-slate-700">{userLabel}</strong>
              </span>
              {currentScore !== 2 && (
                <span className="text-slate-500 text-xs">
                  Correct: <strong className="text-slate-700">{correctLabel}</strong>
                </span>
              )}
            </div>

            {/* Rationale */}
            <div className="rounded-lg bg-white/80 border border-slate-200 p-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Why <span className="text-slate-600">{correctLabel}</span> is correct
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{item.rationale}</p>
              </div>

              {currentScore !== 2 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                    Why not {userLabel}?
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.whyNotAdjacent}</p>
                </div>
              )}

              {item.gmpRef && (
                <div className="border-t border-slate-100 pt-3">
                  <a
                    href={item.gmpRef.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    GMC GMP — {item.gmpRef.label}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pivot insight on last item feedback */}
      {itemPhase === "feedback" && isLastItem && question.pivotInsight && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
            Key insight for this scenario
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{question.pivotInsight}</p>
          {question.gmpRef && (
            <a
              href={question.gmpRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              GMC GMP — {question.gmpRef.label}
            </a>
          )}
        </div>
      )}

      {/* Action button */}
      {itemPhase === "rating" ? (
        <button
          type="button"
          disabled={!selected}
          onClick={handleSubmitItem}
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
  );
}
