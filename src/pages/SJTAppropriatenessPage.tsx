import { Scale } from "lucide-react";
import SJTRatingQuiz from "../components/sjt/SJTRatingQuiz";
import SJTTrainerSessionPage from "../components/sjt/SJTTrainerSessionPage";
import { isRatingQuestion } from "../types/sjt";
import type { SJTRatingQuestion, SJTQuestion } from "../types/sjt";

export default function SJTAppropriatenessPage() {
  return (
    <SJTTrainerSessionPage
      type="appropriateness"
      icon={Scale}
      title="Appropriateness Rater"
      subtitle="Rate each response on a 4-point scale. Half marks for the next best answer."
      seoTitle="UCAT SJT appropriateness trainer (UK)"
      seoDescription="Practice rating responses as Very Appropriate, Appropriate, Inappropriate or Very Inappropriate. Free UCAT SJT trainer grounded in GMC Good Medical Practice."
      canonicalPath="/ucat-sjt-appropriateness-trainer"
      faqId="sjt-appropriateness-faq"
      emptyMessage="No appropriateness questions available yet."
      introContent={
        <>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">How this trainer works</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. You will be presented with a clinical or training scenario.</p>
              <p>
                2. Rate each listed response as{" "}
                <strong className="text-foreground">Very Appropriate</strong>,{" "}
                <strong className="text-foreground">Appropriate</strong>,{" "}
                <strong className="text-foreground">Inappropriate</strong>, or{" "}
                <strong className="text-foreground">Very Inappropriate</strong>.
              </p>
              <p>
                3. After confirming each answer, you will see the correct rating with a full rationale
                and an explanation of how the next best answer compares.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Scoring
            </p>
            <p className="text-sm text-foreground">
              One mark for the exact correct rating. Half a mark for the next best answer. No credit
              for the remaining options.
            </p>
          </div>
        </>
      }
      renderQuiz={(question: SJTQuestion, handlers) =>
        isRatingQuestion(question) ? (
          <SJTRatingQuiz
            key={question.id}
            question={question as SJTRatingQuestion}
            {...handlers}
          />
        ) : null
      }
    />
  );
}
