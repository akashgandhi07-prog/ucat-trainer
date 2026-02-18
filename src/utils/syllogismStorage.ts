/**
 * Persist syllogism session summaries to Supabase (syllogism_sessions).
 * UK English in comments.
 */

import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { supabaseLog } from "../lib/logger";
import { trackEvent } from "../lib/analytics";
import type { SyllogismSessionInsert } from "../types/syllogisms";

export type SyllogismSessionSummary = {
  mode: "micro" | "macro";
  score: number;
  total_questions: number;
  average_time_per_decision: number;
  perGroupAccuracies?: {
    categorical_accuracy?: number | null;
    relative_accuracy?: number | null;
    majority_accuracy?: number | null;
    complex_accuracy?: number | null;
  };
};

export async function saveSyllogismSession(
  summary: SyllogismSessionSummary
): Promise<{ saved: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { saved: false };
    }
    const payload: SyllogismSessionInsert = {
      user_id: user.id,
      mode: summary.mode,
      score: summary.score,
      total_questions: summary.total_questions,
      average_time_per_decision: summary.average_time_per_decision,
      ...(summary.perGroupAccuracies ?? {}),
    };
    await withRetry(async () => {
      const { error } = await supabase.from("syllogism_sessions").insert(payload);
      if (error) throw error;
    });
    trackEvent("trainer_completed", { training_type: "syllogism", mode: summary.mode });
    supabaseLog.info("syllogism_session_saved", {
      mode: summary.mode,
      score: summary.score,
      total: summary.total_questions,
    });
    return { saved: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to save syllogism session:", err);
    return { saved: false, error: message };
  }
}
