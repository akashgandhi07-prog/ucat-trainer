/**
 * Persist DM skills trainer sessions to Supabase or guest localStorage.
 */

import { supabase } from "./supabase";
import { withRetry } from "./retry";
import { supabaseLog } from "./logger";
import { trackEvent } from "./analytics";
import type { DmTrainerSessionSummary, DmTrainerType } from "../types/dmTrainers";

export const GUEST_DM_TRAINER_SESSIONS_KEY = "guest_dm_trainer_sessions_v1";
const MAX_GUEST = 80;

export type DmTrainerSessionPayload = {
  trainer_type: DmTrainerType;
  score: number;
  total_questions: number;
  elapsed_seconds: number;
  retry_mode: boolean;
  answers: DmTrainerSessionSummary["answers"];
};

/**
 * One per-question attempt destined for trainer_question_attempts.
 * questionDbId is the trainer_questions UUID (the `dbId` field on a
 * DmTrainerQuestion) — only questions loaded from the database have one,
 * so local-JSON fallback questions are never logged here (FK constraint).
 */
export type DmTrainerAttemptInput = {
  questionDbId: string;
  skillTag: string;
  difficulty: string;
  isCorrect: boolean;
  selectedAnswer: string | null;
  timeTakenSeconds: number;
};

/**
 * Fire-and-forget batch insert into trainer_question_attempts.
 * Works for signed-in users (user_id = auth.uid()) and guests (user_id null).
 * A failure here must never block or break the session save — errors are
 * logged and swallowed.
 */
export async function logDmTrainerQuestionAttempts(
  userId: string | null,
  sessionId: string | null,
  trainerType: DmTrainerType,
  attempts: DmTrainerAttemptInput[],
): Promise<void> {
  if (attempts.length === 0) return;
  try {
    const rows = attempts.map((a) => ({
      question_id: a.questionDbId,
      user_id: userId,
      session_id: sessionId,
      trainer_type: trainerType,
      skill_tag: a.skillTag || "unknown",
      difficulty: a.difficulty || "medium",
      is_correct: a.isCorrect,
      selected_answer: a.selectedAnswer,
      changed_answer: false,
      time_taken_seconds: a.timeTakenSeconds,
      explanation_viewed: true,
      attempt_number: 1,
    }));
    const { error } = await supabase.from("trainer_question_attempts").insert(rows);
    if (error) throw error;
    supabaseLog.info("dm_trainer_attempts_logged", {
      trainer_type: trainerType,
      count: rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    supabaseLog.error("dm_trainer_attempts_log_failed", {
      message,
      trainer_type: trainerType,
      count: attempts.length,
    });
  }
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isGuestPayload(item: unknown): item is DmTrainerSessionPayload {
  if (!item || typeof item !== "object") return false;
  const v = item as Partial<DmTrainerSessionPayload>;
  return (
    typeof v.trainer_type === "string" &&
    typeof v.score === "number" &&
    typeof v.total_questions === "number" &&
    typeof v.elapsed_seconds === "number" &&
    typeof v.retry_mode === "boolean" &&
    Array.isArray(v.answers)
  );
}

export function summaryToPayload(
  summary: DmTrainerSessionSummary,
  retryMode: boolean,
): DmTrainerSessionPayload {
  return {
    trainer_type: summary.trainerType,
    score: summary.correct,
    total_questions: summary.total,
    elapsed_seconds: summary.elapsedSeconds,
    retry_mode: retryMode,
    answers: summary.answers,
  };
}

export function getGuestDmTrainerSessions(): DmTrainerSessionPayload[] {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_DM_TRAINER_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGuestPayload);
  } catch {
    return [];
  }
}

export function appendGuestDmTrainerSession(payload: DmTrainerSessionPayload): void {
  if (!storageAvailable()) return;
  const sessions = getGuestDmTrainerSessions();
  sessions.push(payload);
  const capped =
    sessions.length > MAX_GUEST ? sessions.slice(sessions.length - MAX_GUEST) : sessions;
  localStorage.setItem(GUEST_DM_TRAINER_SESSIONS_KEY, JSON.stringify(capped));
}

export function clearGuestDmTrainerSessions(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(GUEST_DM_TRAINER_SESSIONS_KEY);
}

/** Maps the hyphenated DmTrainerType to the underscore trainer_type used in user_trainer_state. */
function toDmHistoryType(
  trainerType: DmTrainerType,
): "dm_venn_logic" | "dm_data_logic" | "dm_argument_judge" {
  switch (trainerType) {
    case "venn-logic":     return "dm_venn_logic";
    case "data-logic":     return "dm_data_logic";
    case "argument-judge": return "dm_argument_judge";
  }
}

export async function saveDmTrainerSessionToCloud(
  userId: string,
  payload: DmTrainerSessionPayload,
  options?: { partial?: boolean },
): Promise<{ saved: boolean; sessionId?: string; error?: string }> {
  if (payload.total_questions <= 0) return { saved: false };

  let sessionId: string | undefined;
  try {
    await withRetry(async () => {
      const { data, error } = await supabase
        .from("dm_trainer_sessions")
        .insert({
          user_id: userId,
          ...payload,
        })
        .select("id")
        .single();
      if (error) throw error;
      sessionId = typeof data?.id === "string" ? data.id : undefined;
    });

    // Record the completed drill in the history system (non-retry full runs only;
    // partial abandon flushes don't count as a completed drill).
    // Fire-and-forget — a failure here should never block the session save result.
    if (!payload.retry_mode && !options?.partial) {
      void supabase.rpc("complete_dm_trainer_drill", {
        p_trainer_type: toDmHistoryType(payload.trainer_type),
      });
    }

    supabaseLog.info("dm_trainer_session_saved", {
      trainer_type: payload.trainer_type,
      score: payload.score,
      total: payload.total_questions,
    });
    return { saved: true, sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    supabaseLog.error("dm_trainer_session_save_failed", { message });
    return { saved: false, error: message };
  }
}

export async function persistDmTrainerSession(
  userId: string | null,
  summary: DmTrainerSessionSummary,
  retryMode: boolean,
  options?: { attempts?: DmTrainerAttemptInput[]; completed?: boolean },
): Promise<void> {
  const payload = summaryToPayload(summary, retryMode);
  if (payload.total_questions <= 0) return;

  const completed = options?.completed ?? true;
  let sessionId: string | null = null;

  if (userId) {
    const result = await saveDmTrainerSessionToCloud(userId, payload, {
      partial: !completed,
    });
    sessionId = result.sessionId ?? null;
  } else {
    appendGuestDmTrainerSession(payload);
  }

  // Per-question attempt logging — fire-and-forget, never blocks the session save.
  const attempts = options?.attempts ?? [];
  if (attempts.length > 0) {
    void logDmTrainerQuestionAttempts(userId, sessionId, summary.trainerType, attempts);
  }

  if (completed) {
    trackEvent("trainer_completed", {
      training_type: `dm_${summary.trainerType.replace(/-/g, "_")}`,
      correct: summary.correct,
      total: summary.total,
      time_seconds: summary.elapsedSeconds,
      retry_mode: retryMode,
    });
  }
}

export async function mergeGuestDmTrainerOnSignIn(userId: string): Promise<boolean> {
  const guest = getGuestDmTrainerSessions();
  if (guest.length === 0) return true;

  const rows = guest.map((g) => ({ user_id: userId, ...g }));
  const { error } = await supabase.from("dm_trainer_sessions").insert(rows);
  if (!error) {
    clearGuestDmTrainerSessions();
    return true;
  }
  supabaseLog.error("guest_dm_trainer_merge_failed", { message: error.message });
  return false;
}

/** Legacy localStorage-only key from beta; merge once on sign-in. */
export async function migrateLegacyDmTrainerSessions(userId: string): Promise<void> {
  if (!storageAvailable()) return;
  const legacyKey = "ucat_dm_trainer_sessions_v1";
  const raw = localStorage.getItem(legacyKey);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as DmTrainerSessionSummary[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(legacyKey);
      return;
    }
    const rows = parsed
      .filter((s) => s && typeof s.trainerType === "string" && s.total > 0)
      .map((s) => ({
        user_id: userId,
        trainer_type: s.trainerType,
        score: s.correct,
        total_questions: s.total,
        elapsed_seconds: s.elapsedSeconds ?? 0,
        retry_mode: false,
        answers: s.answers ?? [],
        created_at: s.completedAt ?? new Date().toISOString(),
      }));
    if (rows.length > 0) {
      await supabase.from("dm_trainer_sessions").insert(rows);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    localStorage.removeItem(legacyKey);
  }
}
