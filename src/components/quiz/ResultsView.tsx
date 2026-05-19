import { useState } from "react";
import { Link } from "react-router-dom";
import type { QuestionBreakdownItem } from "./DistortionQuiz";
import ReReadPassageModal from "./ReReadPassageModal";
import { PostDrillUpsell } from "../layout/ProductUpsell";

function HighlightedText({
  text,
  fragment,
  className,
}: {
  text: string;
  fragment: string;
  className: string;
}) {
  if (!fragment) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(fragment.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={className}>{text.slice(idx, idx + fragment.length)}</mark>
      {text.slice(idx + fragment.length)}
    </>
  );
}

export type WpmRating =
  | "too_slow"
  | "slightly_slow"
  | "just_right"
  | "slightly_fast"
  | "too_fast";

type ResultsViewProps = {
  wpm: number;
  correct: number;
  total: number;
  passageTitle?: string;
  passageText?: string;
  timeSpentSeconds?: number;
  questionBreakdown?: QuestionBreakdownItem[];
  onRestart?: () => void;
  onTrySlowerWpm?: () => void;
  onTrySameSettings?: () => void;
  onTryFasterWpm?: () => void;
  saveError?: string | null;
  saving?: boolean;
  guidedChunkingEnabled?: boolean;
  chunkSize?: number;
  suggestedChunkSize?: number | null;
  onAcceptSuggestedChunkSize?: () => void;
};

function userAnswerLabel(a: "true" | "false" | "cant_tell"): string {
  if (a === "true") return "True";
  if (a === "false") return "False";
  return "Can't tell";
}

export default function ResultsView({
  wpm,
  correct,
  total,
  passageTitle,
  passageText,
  timeSpentSeconds = 0,
  questionBreakdown = [],
  onRestart,
  onTrySlowerWpm,
  onTrySameSettings,
  onTryFasterWpm,
  saveError = null,
  saving = false,
  guidedChunkingEnabled = false,
  chunkSize,
  suggestedChunkSize,
  onAcceptSuggestedChunkSize,
}: ResultsViewProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const [passageModalOpen, setPassageModalOpen] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 text-center">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-green-700 border border-border">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          DRILL COMPLETE
        </span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-1">
        Performance Analytics
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Speed Reading{passageTitle ? ` · ${passageTitle}` : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Speed
          </p>
          <p className="text-2xl font-bold text-foreground">{wpm}</p>
          <p className="text-sm text-muted-foreground">WPM</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Accuracy
          </p>
          <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">
            {correct}/{total} correct
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Time spent
          </p>
          <p className="text-2xl font-bold text-foreground">{timeSpentSeconds}</p>
          <p className="text-sm text-muted-foreground">seconds</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-secondary px-4 py-3 text-center">
        <p className="text-sm text-foreground">
          {accuracy >= 80
            ? "Good comprehension at this speed. Try +25 WPM next time to push your pace."
            : "Comprehension was lower; try the same or slightly lower WPM next time and focus on key sentences."}
        </p>
        {guidedChunkingEnabled && chunkSize != null && (
          <p className="text-xs text-muted-foreground mt-2">
            Guided chunking: {chunkSize} word{chunkSize !== 1 ? "s" : ""} per chunk.
            {suggestedChunkSize != null && suggestedChunkSize !== chunkSize && (
              <>
                {" "}
                Based on your comprehension, you could try{" "}
                <span className="font-semibold">
                  {suggestedChunkSize} word{suggestedChunkSize !== 1 ? "s" : ""} per chunk
                </span>{" "}
                next time.
                {onAcceptSuggestedChunkSize && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={onAcceptSuggestedChunkSize}
                      className="text-primary hover:text-primary hover:underline font-medium"
                    >
                      Use suggested
                    </button>
                  </>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {passageText && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setPassageModalOpen(true)}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-slate-200 border border-border rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            View passage
          </button>
          <ReReadPassageModal
            isOpen={passageModalOpen}
            onClose={() => setPassageModalOpen(false)}
            passageText={passageText}
          />
        </div>
      )}

      {questionBreakdown.length > 0 && (
        <div className="mb-8 text-left">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Question breakdown
          </h2>
          <div className="space-y-3">
            {questionBreakdown.map((item, i) => {
              const isCorrect = item.correctAnswerRaw
                ? item.userAnswer === item.correctAnswerRaw
                : (item.userAnswer === "true" && item.correctAnswer) ||
                (item.userAnswer === "false" && !item.correctAnswer);
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${isCorrect
                      ? "bg-training-success-muted border-training-success"
                      : "bg-destructive-muted border-destructive"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-foreground">{i + 1}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isCorrect
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                        }`}
                    >
                      {isCorrect ? (
                        <>
                          <span aria-hidden>✓</span> Correct
                        </>
                      ) : (
                        <>
                          <span aria-hidden>✕</span> Incorrect
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-foreground mb-2">{item.statement}?</p>
                  <p className="text-sm text-muted-foreground">
                    Your answer: {userAnswerLabel(item.userAnswer)}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-red-700 mt-0.5">
                      Correct answer: {item.correctAnswerLabel}
                    </p>
                  )}
                  {item.passageSnippet && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      {item.correctAnswerRaw === "false" && item.originalFragment && item.replacedFragment ? (
                        <>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            What changed
                          </p>
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Statement (what you saw)</p>
                              <p className="text-sm text-foreground bg-red-50 border-l-2 border-red-400 pl-3 py-1.5 rounded-r">
                                <HighlightedText
                                  text={item.statement}
                                  fragment={item.replacedFragment}
                                  className="bg-red-200 text-red-900 font-semibold rounded px-0.5 not-italic"
                                />
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Original passage</p>
                              <p className="text-sm text-foreground bg-green-50 border-l-2 border-green-500 pl-3 py-1.5 rounded-r">
                                <HighlightedText
                                  text={item.passageSnippet}
                                  fragment={item.originalFragment}
                                  className="bg-green-200 text-green-900 font-semibold rounded px-0.5 not-italic"
                                />
                              </p>
                            </div>
                          </div>
                          {item.distortionLabel && (
                            <p className="text-xs text-muted-foreground">
                              Trap: <span className="font-medium text-muted-foreground">{item.distortionLabel}</span>
                            </p>
                          )}
                        </>
                      ) : item.correctAnswerRaw === "true" && item.originalFragment && item.replacedFragment ? (
                        <>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Why it&apos;s true
                          </p>
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Statement (what you saw)</p>
                              <p className="text-sm text-foreground bg-secondary border-l-2 border-primary/40 pl-3 py-1.5 rounded-r">
                                <HighlightedText
                                  text={item.statement}
                                  fragment={item.replacedFragment}
                                  className="bg-secondary text-foreground font-semibold rounded px-0.5 not-italic"
                                />
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Original passage</p>
                              <p className="text-sm text-foreground bg-green-50 border-l-2 border-green-500 pl-3 py-1.5 rounded-r">
                                <HighlightedText
                                  text={item.passageSnippet}
                                  fragment={item.originalFragment}
                                  className="bg-green-200 text-green-900 font-semibold rounded px-0.5 not-italic"
                                />
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            The highlighted word was paraphrased but the meaning is the same — the statement is true.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            From the passage
                          </p>
                          <p className="text-sm text-foreground bg-amber-50/80 border-l-2 border-amber-400 pl-3 py-1.5 rounded-r">
                            {item.passageSnippet}
                          </p>
                          {item.correctAnswerRaw === "false" && (
                            <p className="text-xs text-muted-foreground">
                              {item.distortionLabel
                                ? <>Trap: <span className="font-medium text-foreground">{item.distortionLabel}</span>.</>
                                : "The statement changes or overstates what the passage says."}
                            </p>
                          )}
                          {item.correctAnswerRaw === "true" && (
                            <p className="text-xs text-muted-foreground">The statement matches what the passage says.</p>
                          )}
                          {item.correctAnswerRaw === "cant_tell" && (
                            <p className="text-xs text-muted-foreground">The passage doesn&apos;t contain enough information to confirm or deny the statement shown.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mb-4 text-sm text-destructive bg-destructive-muted border border-destructive rounded-lg px-4 py-2">
          {saveError}
        </p>
      )}
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-2">
          What pace next?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {onTrySlowerWpm && (
            <button
              type="button"
              onClick={onTrySlowerWpm}
              disabled={saving}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Slower -25 WPM
            </button>
          )}
          {onTrySameSettings && (
            <button
              type="button"
              onClick={onTrySameSettings}
              disabled={saving}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Same settings
            </button>
          )}
          {onTryFasterWpm && (
            <button
              type="button"
              onClick={onTryFasterWpm}
              disabled={saving}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Faster +25 WPM
            </button>
          )}
        </div>
      </div>

      {saving && (
        <p className="mb-4 text-sm text-muted-foreground inline-flex items-center gap-2" aria-live="polite">
          <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" aria-hidden />
          Saving…
        </p>
      )}
      <div className="flex flex-col items-center gap-3">
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            disabled={saving}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-70"
          >
            Try another passage
          </button>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-muted-foreground hover:text-primary">
          Back to Home
        </Link>
        <Link
          to="/?mode=speed_reading"
          className="min-h-[44px] inline-flex items-center justify-center py-2 text-muted-foreground hover:text-primary"
        >
          Change settings
        </Link>
      </div>
      <PostDrillUpsell accuracy={total > 0 ? Math.round((correct / total) * 100) : undefined} />
    </div>
  );
}
