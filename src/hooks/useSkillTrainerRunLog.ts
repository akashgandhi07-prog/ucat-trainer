/**
 * Run-level logging for the skill trainers that share SkillTrainerShell (QR Setup,
 * QR Data Extraction, QR Estimation, DM Constraint Builder).
 *
 * Item-level attempts still go to skill_trainer_attempts via saveSkillAttempt. This
 * hook adds the run summary every established trainer writes to `sessions`, so the
 * runs appear on the Dashboard, streaks, the weekly email and admin totals.
 *
 * It mirrors the Conversions trainer: every checked item checkpoints the SAME row
 * (one client_session_id per run, shared with the item attempts), so a run left part
 * way through is still recorded, and a finished run is exactly one row. Guests get the
 * same snapshot in guest_sessions, which AuthContext merges on sign-in.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { appendGuestSession } from "../lib/guestSessions";
import { upsertTrainerSession } from "../lib/trainerSessionLog";
import { supabaseLog } from "../lib/logger";
import { clearActiveTrainer, setActiveTrainer, trackEvent } from "../lib/analytics";
import type { SkillTrainerSessionType } from "../types/training";

type Checkpoint = {
  /** Points scored so far in this run. */
  correct: number;
  /** Points available so far in this run (items checked x decisions per item). */
  total: number;
  /** True for the final checkpoint of the run. */
  completed?: boolean;
};

export function useSkillTrainerRunLog(trainingType: SkillTrainerSessionType, sessionId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const runStartRef = useRef<{ sessionId: string; startedAt: number } | null>(null);
  const completedRef = useRef<string | null>(null);

  // One start per run: a new sessionId (restart or review) is a new run.
  useEffect(() => {
    runStartRef.current = { sessionId, startedAt: Date.now() };
    trackEvent("trainer_started", { training_type: trainingType });
    setActiveTrainer(trainingType, "skill_drill");
  }, [trainingType, sessionId]);

  return useCallback(
    ({ correct, total, completed = false }: Checkpoint) => {
      if (total <= 0) return;
      const startedAt = runStartRef.current?.sessionId === sessionId
        ? runStartRef.current.startedAt
        : Date.now();
      const time_seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const payload = {
        training_type: trainingType,
        difficulty: null,
        wpm: null,
        correct,
        total,
        time_seconds,
      };

      if (completed && completedRef.current !== sessionId) {
        completedRef.current = sessionId;
        trackEvent("trainer_completed", { training_type: trainingType, correct, total });
        clearActiveTrainer();
      }

      if (!userId) {
        try {
          appendGuestSession({ ...payload, client_session_id: sessionId });
        } catch (error) {
          supabaseLog.error("skill_trainer_guest_session_save_failed", {
            trainingType,
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }
      // Failures are logged inside; item attempts are already safe in their own outbox,
      // so a missed checkpoint is not worth interrupting the drill for.
      void upsertTrainerSession(userId, sessionId, payload);
    },
    [trainingType, sessionId, userId],
  );
}
