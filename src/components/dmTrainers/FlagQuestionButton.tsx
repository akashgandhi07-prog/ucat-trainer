import { useState } from "react";
import { AlertCircle, Check, Flag, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Reason = "typo" | "ambiguous" | "wrong_answer" | "bad_explanation" | "technical_issue" | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "wrong_answer",    label: "Wrong answer" },
  { value: "bad_explanation", label: "Bad explanation" },
  { value: "ambiguous",       label: "Ambiguous question" },
  { value: "typo",            label: "Typo / spelling error" },
  { value: "technical_issue", label: "Technical issue" },
  { value: "other",           label: "Other" },
];

type Props = {
  dbId: string;   // trainer_questions UUID
  questionLabel?: string;
};

type State = "idle" | "open" | "submitting" | "done" | "error";

export default function FlagQuestionButton({ dbId, questionLabel }: Props) {
  const [state, setState]   = useState<State>("idle");
  const [reason, setReason] = useState<Reason>("wrong_answer");
  const [notes, setNotes]   = useState("");
  const [error, setError]   = useState<string | null>(null);

  const submit = async () => {
    setState("submitting");
    setError(null);
    const { error: rpcError } = await supabase.rpc("submit_question_report", {
      p_question_id: dbId,
      p_reason:      reason,
      p_notes:       notes.trim() || null,
    });
    if (rpcError) {
      setError(rpcError.message);
      setState("error");
    } else {
      setState("done");
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700">
        <Check className="w-3.5 h-3.5" />
        Report submitted — thank you
      </div>
    );
  }

  if (state === "idle" || state === "error") {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setState("open")}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <Flag className="w-3 h-3" />
          Flag this question
        </button>
        {state === "error" && error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-700">
          Report{questionLabel ? ` · ${questionLabel}` : ""}
        </p>
        <button
          onClick={() => setState("idle")}
          className="text-zinc-400 hover:text-zinc-600"
          aria-label="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`px-2.5 py-1.5 rounded text-xs text-left border transition-colors ${
              reason === r.value
                ? "bg-zinc-900 text-white border-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional: add more detail…"
        rows={2}
        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 resize-none focus:outline-none focus:border-zinc-400"
      />

      <button
        onClick={submit}
        disabled={state === "submitting"}
        className="w-full py-1.5 bg-zinc-900 text-white text-xs rounded hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {state === "submitting" ? "Submitting…" : "Submit report"}
      </button>
    </div>
  );
}
