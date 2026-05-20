import { useMemo, useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import type { QuestionEditPatch } from "../../lib/questionLabEdit";

type EditorRow = {
  id: string;
  status: "draft" | "active" | "archived";
  trainer_type: string;
  question_kind: string;
  stem: string;
  explanation: string;
  content: Record<string, unknown>;
};

type Props = {
  row: EditorRow;
  saving: boolean;
  onSave: (patch: QuestionEditPatch) => Promise<void>;
};

function fieldLabel(text: string) {
  return (
    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{text}</p>
  );
}

function textareaClass() {
  return `mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 leading-relaxed`;
}

export default function QuestionLabQuestionEditor({ row, saving, onSave }: Props) {
  const content = row.content;
  const options = content.options as Record<string, string> | undefined;
  const wrong = content.wrongOptionReasons as Record<string, string> | undefined;
  const review = content.review as Record<string, string> | undefined;
  const convExp = content.explanation as Record<string, string> | undefined;
  const convMethod =
    convExp?.method && typeof convExp.method === "object"
      ? (convExp.method as Record<string, string>)
      : undefined;

  const isActive = row.status === "active";
  const canEditAll = row.status === "draft";
  const isMcq = row.question_kind === "mcq";
  const isNumeric = row.question_kind === "numeric";
  const isSjt =
    row.question_kind === "appropriateness" ||
    row.question_kind === "importance" ||
    row.question_kind === "ranking";

  const [editing, setEditing] = useState(false);
  const [stem, setStem] = useState(row.stem);
  const [question, setQuestion] = useState(String(content.question ?? ""));
  const [explanation, setExplanation] = useState(row.explanation);
  const [generalRule, setGeneralRule] = useState(String(content.generalRule ?? ""));
  const [keyInsight, setKeyInsight] = useState(String(content.keyInsight ?? ""));
  const [pivotInsight, setPivotInsight] = useState(String(content.pivotInsight ?? ""));
  const [reviewWhy, setReviewWhy] = useState(String(review?.whySafeToInclude ?? ""));
  const [reviewRisk, setReviewRisk] = useState(String(review?.ambiguityRisk ?? "low"));
  const [optA, setOptA] = useState(options?.A ?? "");
  const [optB, setOptB] = useState(options?.B ?? "");
  const [optC, setOptC] = useState(options?.C ?? "");
  const [optD, setOptD] = useState(options?.D ?? "");
  const [wrongA, setWrongA] = useState(wrong?.A ?? "");
  const [wrongB, setWrongB] = useState(wrong?.B ?? "");
  const [wrongC, setWrongC] = useState(wrong?.C ?? "");
  const [wrongD, setWrongD] = useState(wrong?.D ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(String(content.correctAnswer ?? ""));
  const [units, setUnits] = useState(String(content.units ?? ""));
  const [examShortcut, setExamShortcut] = useState(String(convExp?.examShortcut ?? ""));
  const [senseCheck, setSenseCheck] = useState(String(convExp?.senseCheck ?? ""));
  const [methodTarget, setMethodTarget] = useState(String(convMethod?.target ?? ""));
  const [methodConvert, setMethodConvert] = useState(String(convMethod?.convert ?? ""));
  const [methodCalculate, setMethodCalculate] = useState(String(convMethod?.calculate ?? ""));
  const [itemsJson, setItemsJson] = useState(
    () => JSON.stringify(content.items ?? [], null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const helpText = useMemo(() => {
    if (isActive) {
      return "Active: edit explanation and teaching fields (line breaks allowed). Use Send to review queue to change answers, stem, or options.";
    }
    return "Draft: edit all fields. Press Enter for line breaks. Em and en dashes are fixed on save.";
  }, [isActive]);

  const resetFields = () => {
    setStem(row.stem);
    setQuestion(String(content.question ?? ""));
    setExplanation(row.explanation);
    setGeneralRule(String(content.generalRule ?? ""));
    setKeyInsight(String(content.keyInsight ?? ""));
    setPivotInsight(String(content.pivotInsight ?? ""));
    setReviewWhy(String(review?.whySafeToInclude ?? ""));
    setReviewRisk(String(review?.ambiguityRisk ?? "low"));
    setOptA(options?.A ?? "");
    setOptB(options?.B ?? "");
    setOptC(options?.C ?? "");
    setOptD(options?.D ?? "");
    setWrongA(wrong?.A ?? "");
    setWrongB(wrong?.B ?? "");
    setWrongC(wrong?.C ?? "");
    setWrongD(wrong?.D ?? "");
    setCorrectAnswer(String(content.correctAnswer ?? ""));
    setUnits(String(content.units ?? ""));
    setExamShortcut(String(convExp?.examShortcut ?? ""));
    setSenseCheck(String(convExp?.senseCheck ?? ""));
    setMethodTarget(String(convMethod?.target ?? ""));
    setMethodConvert(String(convMethod?.convert ?? ""));
    setMethodCalculate(String(convMethod?.calculate ?? ""));
    setItemsJson(JSON.stringify(content.items ?? [], null, 2));
    setError(null);
  };

  const buildContentPatch = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};

    if (isMcq) {
      if (generalRule.trim()) patch.generalRule = generalRule.trim();
      if (keyInsight.trim()) patch.keyInsight = keyInsight.trim();
      const reasons: Record<string, string> = {};
      if (wrongA.trim()) reasons.A = wrongA.trim();
      if (wrongB.trim()) reasons.B = wrongB.trim();
      if (wrongC.trim()) reasons.C = wrongC.trim();
      if (wrongD.trim()) reasons.D = wrongD.trim();
      if (Object.keys(reasons).length) patch.wrongOptionReasons = reasons;
      if (reviewWhy.trim() || reviewRisk.trim()) {
        patch.review = {
          ...(review ?? {}),
          whySafeToInclude: reviewWhy.trim(),
          ambiguityRisk: reviewRisk.trim() || "low",
        };
      }
    }

    if (isNumeric) {
      if (correctAnswer.trim()) patch.correctAnswer = Number(correctAnswer);
      if (units.trim()) patch.units = units.trim();
      patch.explanation = {
        method: {
          target: methodTarget.trim(),
          convert: methodConvert.trim(),
          calculate: methodCalculate.trim(),
        },
        examShortcut: examShortcut.trim(),
        senseCheck: senseCheck.trim(),
        commonTrap: String(content.commonTrap ?? ""),
      };
      if (examShortcut.trim()) patch.workedSolution = examShortcut.trim();
    }

    if (isSjt) {
      if (pivotInsight.trim()) patch.pivotInsight = pivotInsight.trim();
      if (canEditAll) {
        try {
          patch.items = JSON.parse(itemsJson) as unknown[];
        } catch {
          throw new Error("Items JSON is invalid.");
        }
      }
    }

    return patch;
  };

  const handleSave = async () => {
    setError(null);
    try {
      const patch: QuestionEditPatch = {
        explanation: explanation.trim(),
        contentPatch: buildContentPatch(),
      };

      if (canEditAll) {
        patch.stem = stem.trim();
        if (isMcq && content.question) patch.question = question.trim();
        if (isMcq && options) {
          patch.options = {
            A: optA.trim(),
            B: optB.trim(),
            C: optC.trim(),
            D: optD.trim(),
          };
        }
      }

      await onSave(patch);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const handleCancel = () => {
    resetFields();
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-zinc-300 rounded hover:bg-zinc-50 text-zinc-700"
      >
        <Pencil className="w-3 h-3" />
        Edit copy
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-600">{helpText}</p>

      {canEditAll && (
        <label className="block">
          {fieldLabel(isNumeric ? "Prompt" : "Stem")}
          <textarea
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            rows={3}
            className={textareaClass()}
          />
        </label>
      )}

      {canEditAll && isMcq && !!content.question && (
        <label className="block">
          {fieldLabel("Question")}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className={textareaClass()}
          />
        </label>
      )}

      {canEditAll && isMcq && options && (
        <div>
          {fieldLabel("Options")}
          <div className="space-y-2">
            {(
              [
                ["A", optA, setOptA],
                ["B", optB, setOptB],
                ["C", optC, setOptC],
                ["D", optD, setOptD],
              ] as const
            ).map(([key, value, setter]) => (
              <div key={key} className="flex gap-2 items-start">
                <span className="text-zinc-400 w-4 pt-2 text-xs">{key}</span>
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  rows={2}
                  className={`flex-1 ${textareaClass()}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {canEditAll && isNumeric && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            {fieldLabel("Correct answer")}
            <input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Units label")}
            <input
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className={textareaClass()}
            />
          </label>
        </div>
      )}

      {canEditAll && isSjt && (
        <label className="block">
          {fieldLabel("Items (JSON)")}
          <textarea
            value={itemsJson}
            onChange={(e) => setItemsJson(e.target.value)}
            rows={8}
            className={`${textareaClass()} font-mono text-xs`}
          />
        </label>
      )}

      <label className="block">
        {fieldLabel("Explanation")}
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={10}
          className={`${textareaClass()} font-mono`}
        />
      </label>

      {isMcq && (
        <>
          <label className="block">
            {fieldLabel("General rule")}
            <textarea
              value={generalRule}
              onChange={(e) => setGeneralRule(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Key insight")}
            <textarea
              value={keyInsight}
              onChange={(e) => setKeyInsight(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <div>
            {fieldLabel("Wrong option reasons")}
            <div className="space-y-2">
              {(
                [
                  ["A", wrongA, setWrongA],
                  ["B", wrongB, setWrongB],
                  ["C", wrongC, setWrongC],
                  ["D", wrongD, setWrongD],
                ] as const
              ).map(([key, value, setter]) => (
                <div key={key} className="flex gap-2 items-start">
                  <span className="text-zinc-400 w-4 pt-2 text-xs">{key}</span>
                  <textarea
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    rows={2}
                    className={`flex-1 ${textareaClass()}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <label className="block">
            {fieldLabel("Review: why safe to include")}
            <textarea
              value={reviewWhy}
              onChange={(e) => setReviewWhy(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Review: ambiguity risk")}
            <select
              value={reviewRisk}
              onChange={(e) => setReviewRisk(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
        </>
      )}

      {isNumeric && (
        <>
          <label className="block">
            {fieldLabel("Method: target")}
            <textarea
              value={methodTarget}
              onChange={(e) => setMethodTarget(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Method: convert")}
            <textarea
              value={methodConvert}
              onChange={(e) => setMethodConvert(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Method: calculate")}
            <textarea
              value={methodCalculate}
              onChange={(e) => setMethodCalculate(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Exam shortcut")}
            <textarea
              value={examShortcut}
              onChange={(e) => setExamShortcut(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
          <label className="block">
            {fieldLabel("Sense check")}
            <textarea
              value={senseCheck}
              onChange={(e) => setSenseCheck(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </label>
        </>
      )}

      {isSjt && (
        <label className="block">
          {fieldLabel("Pivot insight")}
          <textarea
            value={pivotInsight}
            onChange={(e) => setPivotInsight(e.target.value)}
            rows={2}
            className={textareaClass()}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-300 text-xs rounded hover:bg-white disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
