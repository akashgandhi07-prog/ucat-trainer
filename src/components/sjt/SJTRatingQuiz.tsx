import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { SJTRatingQuestion, RatingAnswer, SJTRating, AppropriatenessRating, ImportanceRating } from "../../types/sjt";
import {
  APPROPRIATENESS_RATINGS,
  IMPORTANCE_RATINGS,
  APPROPRIATENESS_LABELS,
  IMPORTANCE_LABELS,
  getAdjacentRating,
  getRatingLabel,
} from "../../types/sjt";
import SJTDomainBadge from "./SJTDomainBadge";
import { cn } from "../../lib/cn";

type Phase = "answering" | "results";

type Props = {
  question: SJTRatingQuestion;
  onComplete: (score: number, total: number) => void;
};

const ratingButtonBase =
  "flex-1 min-w-0 px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 cursor-pointer select-none";

function ratingButtonClass(
  rating: SJTRating,
  selected: SJTRating | undefined,
  type: "appropriateness" | "importance"
): string {
  const isSelected = selected === rating;
  if (type === "appropriateness") {
    const r = rating as AppropriatenessRating;
    if (r === "very_appropriate")
      return cn(ratingButtonBase, isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50");
    if (r === "appropriate")
      return cn(ratingButtonBase, isSelected ? "bg-emerald-400 border-emerald-400 text-white" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50");
    if (r === "inappropriate")
      return cn(ratingButtonBase, isSelected ? "bg-red-400 border-red-400 text-white" : "border-red-200 text-red-600 hover:bg-red-50");
    return cn(ratingButtonBase, isSelected ? "bg-red-600 border-red-600 text-white" : "border-red-300 text-red-700 hover:bg-red-50");
  } else {
    const r = rating as ImportanceRating;
    if (r === "very_important")
      return cn(ratingButtonBase, isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 text-blue-700 hover:bg-blue-50");
    if (r === "important")
      return cn(ratingButtonBase, isSelected ? "bg-blue-400 border-blue-400 text-white" : "border-blue-200 text-blue-600 hover:bg-blue-50");
    if (r === "minor_importance")
      return cn(ratingButtonBase, isSelected ? "bg-slate-400 border-slate-400 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50");
    return cn(ratingButtonBase, isSelected ? "bg-slate-600 border-slate-600 text-white" : "border-slate-300 text-slate-500 hover:bg-slate-50");
  }
}

function getRatingScale(type: "appropriateness" | "importance"): SJTRating[] {
  return type === "appropriateness" ? APPROPRIATENESS_RATINGS : IMPORTANCE_RATINGS;
}

function getRatingLabelMap(type: "appropriateness" | "importance"): Record<string, string> {
  return type === "appropriateness" ? APPROPRIATENESS_LABELS : IMPORTANCE_LABELS;
}

function isExactlyCorrect(userRating: SJTRating, correct: SJTRating): boolean {
  return userRating === correct;
}

function isAdjacentCorrect(userRating: SJTRating, correct: SJTRating, type: "appropriateness" | "importance"): boolean {
  const adj = getAdjacentRating(correct, type);
  return adj === userRating;
}

function scoreItem(userRating: SJTRating | undefined, correct: SJTRating, type: "appropriateness" | "importance"): 0 | 1 | 2 {
  if (!userRating) return 0;
  if (isExactlyCorrect(userRating, correct)) return 2;
  if (isAdjacentCorrect(userRating, correct, type)) return 1;
  return 0;
}

type ItemResultCardProps = {
  item: SJTRatingQuestion["items"][0];
  userRating: SJTRating | undefined;
  type: "appropriateness" | "importance";
  index: number;
};

function ItemResultCard({ item, userRating, type, index }: ItemResultCardProps) {
  const [expanded, setExpanded] = useState(true);
  const score = scoreItem(userRating, item.correctRating, type);
  const labelMap = getRatingLabelMap(type);
  const correctLabel = labelMap[item.correctRating];
  const userLabel = userRating ? labelMap[userRating] : "Not answered";
  const isCorrect = score === 2;
  const isPartial = score === 1;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isCorrect ? "border-emerald-200 bg-emerald-50/60" : isPartial ? "border-amber-200 bg-amber-50/60" : "border-red-200 bg-red-50/60"
      )}
    >
      <button
        type="button"
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="shrink-0 mt-0.5">
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden />
          ) : isPartial ? (
            <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" aria-hidden />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Consideration {index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                isCorrect ? "bg-emerald-200 text-emerald-800" : isPartial ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"
              )}
            >
              {isCorrect ? "Full marks" : isPartial ? "Partial credit" : "Incorrect"}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-snug">{item.text}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="text-slate-500">
              Your answer: <span className="font-semibold text-slate-700">{userLabel}</span>
            </span>
            {!isCorrect && (
              <span className="text-slate-500">
                Correct: <span className="font-semibold text-slate-700">{correctLabel}</span>
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200/60 pt-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Why {correctLabel} is correct
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{item.rationale}</p>
          </div>
          {!isCorrect && (
            <div className="bg-white/70 rounded-lg border border-slate-200 p-3">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                Why not {userLabel}?
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.whyNotAdjacent}</p>
            </div>
          )}
          {item.gmpRef && (
            <a
              href={item.gmpRef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              {item.gmpRef.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function SJTRatingQuiz({ question, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("answering");
  const [answers, setAnswers] = useState<RatingAnswer>({});
  const scale = getRatingScale(question.type);
  const labelMap = getRatingLabelMap(question.type);

  const allAnswered = question.items.every((item) => answers[item.id] != null);

  const totalScore = question.items.reduce(
    (sum, item) => sum + scoreItem(answers[item.id], item.correctRating, question.type),
    0
  );
  const maxScore = question.items.length * 2;

  function handleSubmit() {
    setPhase("results");
    onComplete(totalScore, maxScore);
  }

  if (phase === "results") {
    const pct = Math.round((totalScore / maxScore) * 100);
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-3",
              pct === 100
                ? "bg-emerald-100 text-emerald-800"
                : pct >= 60
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            )}
          >
            {totalScore} / {maxScore} points
          </div>
          <p className="text-xs text-slate-500">
            Full marks = exact correct rating · Partial credit = one step away
          </p>
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
          {question.items.map((item, i) => (
            <ItemResultCard
              key={item.id}
              item={item}
              userRating={answers[item.id]}
              type={question.type}
              index={i}
            />
          ))}
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
          {question.type === "appropriateness"
            ? "How appropriate are the following responses?"
            : "How important are the following considerations?"}
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Rate each item using the scale below. You can change your answer before submitting.
        </p>

        <div className="flex gap-1.5 mb-5">
          {scale.map((r) => (
            <div key={r} className="flex-1 text-center">
              <span className="text-[10px] font-semibold text-slate-500 leading-tight block">
                {labelMap[r]}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {question.items.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-800 mb-3 leading-snug">
                <span className="font-semibold text-slate-400 mr-1.5">{i + 1}.</span>
                {item.text}
              </p>
              <div className="flex gap-1.5">
                {scale.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={ratingButtonClass(r, answers[item.id], question.type)}
                    onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: r }))}
                    aria-pressed={answers[item.id] === r}
                    aria-label={`Rate as ${labelMap[r]}`}
                  >
                    {question.type === "appropriateness"
                      ? r === "very_appropriate" ? "VA" : r === "appropriate" ? "A" : r === "inappropriate" ? "I" : "VI"
                      : r === "very_important" ? "VI" : r === "important" ? "I" : r === "minor_importance" ? "MI" : "NI"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!allAnswered}
        onClick={handleSubmit}
        className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {allAnswered ? "Submit answers" : `Rate all ${question.items.length} items to continue`}
      </button>
    </div>
  );
}
