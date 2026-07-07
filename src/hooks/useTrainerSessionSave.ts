/**
 * Shared session-saving plumbing for the trainer pages.
 *
 * Every trainer page historically hand-copied the same cluster: a
 * `sessionIdRef` + `hasAutoSavedRef` + `mountedRef` trio, `saveError` / `saving`
 * state, client-session-id generation and reset, an auth-vs-guest save that
 * upserts through `upsertTrainerSession`, and the one-shot auto-save when the
 * page reaches its results phase.
 *
 * This hook owns exactly that plumbing while leaving every page-specific
 * decision (the save payload, the guest payload, the log line, and what to
 * reset on restart) to injected callbacks, so behaviour is preserved
 * per-page: same analytics events, same payloads, same error copy, same timing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { appendGuestSession } from "../lib/guestSessions";
import type { GuestSessionPayload } from "../lib/guestSessions";
import { newClientSessionId, upsertTrainerSession } from "../lib/trainerSessionLog";
import type { TrainerSessionUpsert } from "../lib/trainerSessionLog";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import { supabaseLog } from "../lib/logger";
import { trackEvent, clearActiveTrainer } from "../lib/analytics";

type AuthUser = { id: string } | null | undefined;

export type SaveProgressOptions = { skipRestart?: boolean };

type RunSaveArgs = {
  user: AuthUser;
  /** The client session id to upsert against (usually `sessionIdRef.current`). */
  clientSessionId: string;
  /** When there is no signed-in user, the guest snapshot to persist locally. */
  buildGuestPayload: () => GuestSessionPayload;
  /** For a signed-in user, the cloud snapshot to upsert. */
  buildAuthPayload: () => TrainerSessionUpsert;
  /**
   * `training_type` used for the `trainer_completed` analytics event and the
   * default success log line. Kept explicit so it stays identical to the
   * hand-written call sites.
   */
  trainingType: string;
  difficulty?: string | null;
  /** Overrides the default `supabaseLog.info` line emitted on a successful save. */
  logSuccess?: () => void;
  /** Runs on a successful save when `opts.skipRestart` is falsy (the restart body). */
  onRestart?: () => void;
};

export type UseTrainerSessionSave = {
  /** Stable client session id for the current run; regenerated on restart. */
  sessionIdRef: React.MutableRefObject<string>;
  /** Guards the one-shot auto-save so entering results saves at most once. */
  hasAutoSavedRef: React.MutableRefObject<boolean>;
  /** True between mount and unmount; use before setting state after an await. */
  mountedRef: React.MutableRefObject<boolean>;
  saveError: string | null;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Runs the auth-vs-guest save with the dominant page ordering:
   * guest -> local append and return; auth -> setSaving(true), upsert, and on
   * success log + `trainer_completed` event + clearActiveTrainer + (optional)
   * restart, on failure set the standard error copy. `setSaving(false)` runs at
   * the end if still mounted.
   */
  runSave: (args: RunSaveArgs, opts?: SaveProgressOptions) => Promise<void>;
  /** Regenerates the session id; pass `resetAutoSaveGuard` to also re-arm auto-save. */
  resetSession: (opts?: { resetAutoSaveGuard?: boolean }) => void;
};

export function useTrainerSessionSave(): UseTrainerSessionSave {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasAutoSavedRef = useRef(false);
  const sessionIdRef = useRef(newClientSessionId());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runSave = useCallback(
    async (args: RunSaveArgs, opts?: SaveProgressOptions) => {
      const {
        user,
        buildGuestPayload,
        buildAuthPayload,
        trainingType,
        difficulty,
        logSuccess,
        onRestart,
      } = args;

      if (!user) {
        appendGuestSession(buildGuestPayload());
        return;
      }

      setSaveError(null);
      setSaving(true);
      const payload = buildAuthPayload();
      const saved = await upsertTrainerSession(user.id, args.clientSessionId, payload);
      if (saved) {
        if (logSuccess) {
          logSuccess();
        } else {
          supabaseLog.info("Trainer session saved", {
            userId: user.id,
            correct: payload.correct,
            total: payload.total,
          });
        }
        trackEvent("trainer_completed", { training_type: trainingType, difficulty });
        clearActiveTrainer();
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          onRestart?.();
        }
      } else {
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(null));
      }
      if (mountedRef.current) setSaving(false);
    },
    [],
  );

  const resetSession = useCallback((opts?: { resetAutoSaveGuard?: boolean }) => {
    if (opts?.resetAutoSaveGuard) hasAutoSavedRef.current = false;
    sessionIdRef.current = newClientSessionId();
  }, []);

  return {
    sessionIdRef,
    hasAutoSavedRef,
    mountedRef,
    saveError,
    setSaveError,
    saving,
    setSaving,
    runSave,
    resetSession,
  };
}
