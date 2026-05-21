import type { ReactNode } from "react";
import {
  APPROPRIATENESS_LABELS,
  IMPORTANCE_LABELS,
  type AppropriatenessRating,
  type ImportanceRating,
} from "../../types/sjt";

type Props = {
  questionKind: string;
  content: Record<string, unknown>;
  stem?: string;
};

const OPTION_IDS = ["A", "B", "C", "D"] as const;

function PreviewSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

function previewText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function sjtRankLabel(rank: number): string {
  if (rank === 1) return "Most appropriate";
  if (rank === 3) return "Least appropriate";
  return "Middle option";
}

function sjtRatingLabel(
  rating: string,
  questionKind: "appropriateness" | "importance",
): string {
  if (questionKind === "appropriateness") {
    return APPROPRIATENESS_LABELS[rating as AppropriatenessRating] ?? rating.replace(/_/g, " ");
  }
  return IMPORTANCE_LABELS[rating as ImportanceRating] ?? rating.replace(/_/g, " ");
}

function tfctVerdictLabel(verdict: string): string {
  if (verdict === "cannot_tell") return "Cannot tell";
  if (verdict === "true") return "True";
  if (verdict === "false") return "False";
  return verdict.replace(/_/g, " ");
}

function optionLabelsFromContent(
  content: Record<string, unknown>,
): Partial<Record<(typeof OPTION_IDS)[number], string>> {
  const labels: Partial<Record<(typeof OPTION_IDS)[number], string>> = {};
  const list = content.optionsList;
  if (!Array.isArray(list)) return labels;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? "").toUpperCase();
    const label = previewText(row.label);
    if (label && (OPTION_IDS as readonly string[]).includes(id)) {
      labels[id as (typeof OPTION_IDS)[number]] = label;
    }
  }
  return labels;
}

function McqContentPreview({ content }: { content: Record<string, unknown> }) {
  const options = content.options as Record<string, string> | undefined;
  const wrong = content.wrongOptionReasons as Record<string, string> | undefined;
  const review = content.review as Record<string, unknown> | undefined;
  const workingSteps = Array.isArray(content.workingSteps) ? content.workingSteps : null;
  const optionLabels = optionLabelsFromContent(content);
  const question = previewText(content.question);
  const generalRule = previewText(content.generalRule);
  const keyInsight = previewText(content.keyInsight);
  const commonTrap = previewText(content.commonTrap);

  return (
    <>
      {question && (
        <PreviewSection label="Question">
          <p className="text-zinc-800 whitespace-pre-wrap">{question}</p>
        </PreviewSection>
      )}
      {options && (
        <PreviewSection label="Options">
          <ul className="space-y-2">
            {OPTION_IDS.map((k) => {
              const text = options[k];
              if (!text) return null;
              const isCorrect = content.correctAnswer === k;
              const label = optionLabels[k];
              const wrongReason = wrong?.[k];
              return (
                <li
                  key={k}
                  className={`rounded border border-zinc-200 bg-white p-2 ${isCorrect ? "border-zinc-400" : ""}`}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="text-zinc-400 w-4 shrink-0 font-medium">{k}</span>
                    {isCorrect && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-black text-white">
                        Correct
                      </span>
                    )}
                    {label && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                        {label.replace(/-/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 ${isCorrect ? "text-black font-medium" : "text-zinc-700"}`}>
                    {text}
                  </p>
                  {wrongReason && (
                    <p className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                      <span className="font-semibold">Why wrong: </span>
                      {wrongReason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </PreviewSection>
      )}
      {workingSteps && workingSteps.length > 0 && (
        <PreviewSection label="Working steps">
          <ol className="list-decimal list-inside space-y-1 text-zinc-700">
            {workingSteps.map((step, idx) => (
              <li key={idx} className="whitespace-pre-wrap">
                {String(step)}
              </li>
            ))}
          </ol>
        </PreviewSection>
      )}
      {generalRule && (
        <PreviewSection label="General rule">
          <p className="text-zinc-700 whitespace-pre-wrap">{generalRule}</p>
        </PreviewSection>
      )}
      {keyInsight && (
        <PreviewSection label="Key insight">
          <p className="text-zinc-700 whitespace-pre-wrap">{keyInsight}</p>
        </PreviewSection>
      )}
      {commonTrap && (
        <PreviewSection label="Common trap">
          <p className="text-zinc-700 whitespace-pre-wrap">{commonTrap}</p>
        </PreviewSection>
      )}
      {review && (previewText(review.whySafeToInclude) || previewText(review.ambiguityRisk)) && (
        <PreviewSection label="Review notes">
          {previewText(review.whySafeToInclude) && (
            <p className="text-zinc-700 whitespace-pre-wrap mb-1">
              <span className="font-semibold text-zinc-500">Why safe to include: </span>
              {previewText(review.whySafeToInclude)}
            </p>
          )}
          {previewText(review.ambiguityRisk) && (
            <p className="text-zinc-600 text-xs">
              Ambiguity risk: {previewText(review.ambiguityRisk)}
            </p>
          )}
        </PreviewSection>
      )}
    </>
  );
}

function NumericContentPreview({
  content,
  stem,
}: {
  content: Record<string, unknown>;
  stem?: string;
}) {
  const convExp =
    content.explanation && typeof content.explanation === "object"
      ? (content.explanation as Record<string, unknown>)
      : undefined;
  const method =
    convExp?.method && typeof convExp.method === "object"
      ? (convExp.method as Record<string, unknown>)
      : undefined;

  const prompt = previewText(content.question);
  const showPrompt = prompt && prompt !== stem?.trim();
  const answer = content.correctAnswer;
  const units = previewText(content.units);
  const tolerance = content.tolerance;
  const category = previewText(content.category);
  const workedSolution = previewText(content.workedSolution);
  const commonTrap =
    previewText(content.commonTrap) ?? previewText(convExp?.commonTrap);
  const methodTarget = previewText(method?.target);
  const methodConvert = previewText(method?.convert);
  const methodCalculate = previewText(method?.calculate);
  const examShortcut = previewText(convExp?.examShortcut);
  const senseCheck = previewText(convExp?.senseCheck);

  const answerLabel =
    answer != null && !Number.isNaN(Number(answer))
      ? `${answer}${units ? ` ${units}` : ""}`
      : null;

  return (
    <>
      {showPrompt && (
        <PreviewSection label="Prompt">
          <p className="text-zinc-800 whitespace-pre-wrap">{prompt}</p>
        </PreviewSection>
      )}
      {answerLabel && (
        <PreviewSection label="Correct answer">
          <p className="text-zinc-800 font-medium">{answerLabel}</p>
          {tolerance != null && Number(tolerance) > 0 && (
            <p className="text-xs text-zinc-500 mt-1">Tolerance: ±{String(tolerance)}</p>
          )}
        </PreviewSection>
      )}
      {category && (
        <PreviewSection label="Category">
          <p className="text-zinc-700">{category}</p>
        </PreviewSection>
      )}
      {workedSolution && (
        <PreviewSection label="Worked solution">
          <p className="text-zinc-700 whitespace-pre-wrap">{workedSolution}</p>
        </PreviewSection>
      )}
      {(methodTarget || methodConvert || methodCalculate) && (
        <PreviewSection label="Method">
          <div className="space-y-1 text-zinc-700">
            {methodTarget && (
              <p className="whitespace-pre-wrap">
                <span className="font-semibold text-zinc-500">Target: </span>
                {methodTarget}
              </p>
            )}
            {methodConvert && (
              <p className="whitespace-pre-wrap">
                <span className="font-semibold text-zinc-500">Convert: </span>
                {methodConvert}
              </p>
            )}
            {methodCalculate && (
              <p className="whitespace-pre-wrap">
                <span className="font-semibold text-zinc-500">Calculate: </span>
                {methodCalculate}
              </p>
            )}
          </div>
        </PreviewSection>
      )}
      {examShortcut && (
        <PreviewSection label="Exam shortcut">
          <p className="text-zinc-700 whitespace-pre-wrap">{examShortcut}</p>
        </PreviewSection>
      )}
      {senseCheck && (
        <PreviewSection label="Sense check">
          <p className="text-zinc-700 whitespace-pre-wrap">{senseCheck}</p>
        </PreviewSection>
      )}
      {commonTrap && (
        <PreviewSection label="Common trap">
          <p className="text-zinc-700 whitespace-pre-wrap">{commonTrap}</p>
        </PreviewSection>
      )}
    </>
  );
}

function SjtContentPreview({
  questionKind,
  content,
}: {
  questionKind: string;
  content: Record<string, unknown>;
}) {
  const items = content.items;
  if (!Array.isArray(items) || items.length === 0) return null;

  const isRanking = questionKind === "ranking";
  const isRating = questionKind === "appropriateness" || questionKind === "importance";
  if (!isRanking && !isRating) return null;

  const domain = previewText(content.domain);
  const pivotInsight = previewText(content.pivotInsight);
  const sortedItems = isRanking
    ? [...items].sort(
        (a, b) =>
          Number((a as Record<string, unknown>).rank ?? 0) -
          Number((b as Record<string, unknown>).rank ?? 0),
      )
    : items;

  return (
    <>
      {domain && (
        <PreviewSection label="GMC domain">
          <p className="text-zinc-700">{domain.replace(/_/g, " ")}</p>
        </PreviewSection>
      )}
      <PreviewSection label={isRanking ? "Response options" : "Items to rate"}>
        <ul className="space-y-3">
          {sortedItems.map((raw, idx) => {
            const item = raw as Record<string, unknown>;
            const id = String(item.id ?? idx + 1);
            const text = String(item.text ?? "");
            const rationale = previewText(item.rationale);
            const answerLabel = isRanking
              ? sjtRankLabel(Number(item.rank))
              : isRating
                ? sjtRatingLabel(String(item.correctRating ?? ""), questionKind)
                : null;

            return (
              <li key={id} className="rounded border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-start gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-400 shrink-0">{id}</span>
                  {answerLabel && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-black text-white">
                      {answerLabel}
                    </span>
                  )}
                </div>
                <p className="text-zinc-800 whitespace-pre-wrap">{text}</p>
                {rationale && (
                  <p className="mt-1.5 text-xs text-zinc-600 whitespace-pre-wrap">
                    <span className="font-semibold text-zinc-500">Rationale: </span>
                    {rationale}
                  </p>
                )}
                {isRating && previewText(item.whyNotAdjacent) && (
                  <p className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                    <span className="font-semibold">Why not adjacent: </span>
                    {previewText(item.whyNotAdjacent)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </PreviewSection>
      {pivotInsight && (
        <PreviewSection label="Pivot insight">
          <p className="text-zinc-700 whitespace-pre-wrap">{pivotInsight}</p>
        </PreviewSection>
      )}
    </>
  );
}

function VrPassageContentPreview({ content }: { content: Record<string, unknown> }) {
  const passageTitle = previewText(content.passageTitle);
  const topic = previewText(content.topic);
  const passageBody = previewText(content.passageBody);
  const questions = Array.isArray(content.questions) ? content.questions : null;

  if (!passageBody && (!questions || questions.length === 0)) return null;

  return (
    <>
      {(topic || passageTitle) && (
        <PreviewSection label="Passage">
          {topic && <p className="text-xs text-zinc-500 mb-1">{topic}</p>}
          {passageTitle && <p className="text-zinc-800 font-medium mb-2">{passageTitle}</p>}
          {passageBody && (
            <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">{passageBody}</p>
          )}
        </PreviewSection>
      )}
      {questions && questions.length > 0 && (
        <PreviewSection label="Statements">
          <ul className="space-y-3">
            {questions.map((raw, idx) => {
              const q = raw as Record<string, unknown>;
              const id = String(q.id ?? idx + 1);
              const statement = previewText(q.statement);
              const verdict = previewText(q.correctVerdict);
              const explanation = previewText(q.explanation);
              const evidence = previewText(q.evidenceQuote);

              return (
                <li key={id} className="rounded border border-zinc-200 bg-white p-3">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-400 shrink-0">{id}</span>
                    {verdict && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-black text-white">
                        {tfctVerdictLabel(verdict)}
                      </span>
                    )}
                  </div>
                  {statement && (
                    <p className="text-zinc-800 whitespace-pre-wrap">{statement}</p>
                  )}
                  {explanation && (
                    <p className="mt-1.5 text-xs text-zinc-600 whitespace-pre-wrap">
                      <span className="font-semibold text-zinc-500">Explanation: </span>
                      {explanation}
                    </p>
                  )}
                  {evidence && (
                    <p className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap italic">
                      <span className="font-semibold not-italic">Evidence: </span>
                      {evidence}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </PreviewSection>
      )}
    </>
  );
}

export default function QuestionLabContentPreview({ questionKind, content, stem }: Props) {
  return (
    <div className="space-y-3">
      {questionKind === "mcq" && <McqContentPreview content={content} />}
      {questionKind === "numeric" && <NumericContentPreview content={content} stem={stem} />}
      {(questionKind === "appropriateness" ||
        questionKind === "importance" ||
        questionKind === "ranking") && (
        <SjtContentPreview questionKind={questionKind} content={content} />
      )}
      {questionKind === "true-false-ct" && <VrPassageContentPreview content={content} />}
    </div>
  );
}
