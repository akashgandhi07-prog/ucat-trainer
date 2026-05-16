import { Star } from "lucide-react";
import SJTRatingQuiz from "../components/sjt/SJTRatingQuiz";
import SJTTrainerSessionPage from "../components/sjt/SJTTrainerSessionPage";
import { isRatingQuestion } from "../types/sjt";
import type { SJTRatingQuestion, SJTQuestion } from "../types/sjt";

export default function SJTImportancePage() {
  return (
    <SJTTrainerSessionPage
      type="importance"
      icon={Star}
      title="Importance Rater"
      subtitle="Rate how important each consideration is when deciding what to do."
      seoTitle="UCAT SJT importance trainer (UK)"
      seoDescription="Practice rating considerations as Very Important, Important, Of Minor Importance or Not Important at All. Free UCAT SJT trainer grounded in GMC Good Medical Practice."
      canonicalPath="/ucat-sjt-importance-trainer"
      faqId="sjt-importance-faq"
      emptyMessage="No importance questions available yet."
      introContent={
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">How this trainer works</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. You will be presented with a clinical or training scenario.</p>
              <p>
                2. Rate each listed consideration as{" "}
                <strong className="text-foreground">Very Important</strong>,{" "}
                <strong className="text-foreground">Important</strong>,{" "}
                <strong className="text-foreground">Of Minor Importance</strong>, or{" "}
                <strong className="text-foreground">Not Important at All</strong>.
              </p>
              <p>
                3. After confirming each answer, you will see why each consideration sits at the
                rating it does, and how the next best answer compares.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Key pattern to spot
            </p>
            <p className="text-sm text-foreground">
              Exact answers are worth one mark. The next best answer is worth half a mark, so be
              especially careful when choosing between adjacent ratings.
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
