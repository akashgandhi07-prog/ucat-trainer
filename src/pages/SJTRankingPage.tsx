import { ArrowUpDown } from "lucide-react";
import SJTRankingQuiz from "../components/sjt/SJTRankingQuiz";
import SJTTrainerSessionPage from "../components/sjt/SJTTrainerSessionPage";
import { isRankingQuestion } from "../types/sjt";
import type { SJTRankingQuestion, SJTQuestion } from "../types/sjt";

export default function SJTRankingPage() {
  return (
    <SJTTrainerSessionPage
      type="ranking"
      icon={ArrowUpDown}
      title="Most / Least Appropriate"
      subtitle="Pick the best and worst response from three options."
      seoTitle="UCAT SJT ranking trainer (UK)"
      seoDescription="Practice choosing the most and least appropriate responses in UCAT SJT scenarios. Free trainer grounded in GMC Good Medical Practice."
      canonicalPath="/ucat-sjt-ranking-trainer"
      faqId="sjt-ranking-faq"
      emptyMessage="No ranking questions available yet."
      introContent={
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">How this trainer works</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. You will be presented with a clinical or training scenario and three possible responses.</p>
              <p>
                2. Select the <strong className="text-foreground">most appropriate</strong> response
                and the <strong className="text-foreground">least appropriate</strong> response.
              </p>
              <p>
                3. After submitting, you will see a full rationale for each option&apos;s position in
                the ranking.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              The middle option
            </p>
            <p className="text-sm text-foreground">
              You are not scored on the middle option, but reading its rationale helps you understand
              the gradient between best and worst. That gradient is where most students lose marks.
            </p>
          </div>
        </>
      }
      renderQuiz={(question: SJTQuestion, onComplete) =>
        isRankingQuestion(question) ? (
          <SJTRankingQuiz
            key={question.id}
            question={question as SJTRankingQuestion}
            onComplete={onComplete}
          />
        ) : null
      }
    />
  );
}
