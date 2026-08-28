/**
 * Remembers which DM skills trainer questions a student has already been served,
 * so a new drill draws from what they have not seen yet.
 *
 * Students reported getting the same questions again on every practice: a drill
 * samples 10 at random from a bank of roughly 40 to 55, so repeats were near
 * certain. The syllogism, SJT and inference trainers solve this server-side with
 * user_question_history; the DM RPC serves the whole active bank in one call and
 * keeps no per-question history, so the cycle is tracked here instead. That also
 * covers signed-out students, who have no server history at all.
 *
 * Storage is per browser. A cycle ends when the bank runs out of unseen
 * questions, at which point the list clears and every question is available
 * again, matching the server-side behaviour.
 *
 * UK English in comments.
 */

import type { DmTrainerType } from "../types/dmTrainers";

const KEY_PREFIX = "dm_trainer_seen_v1";
/** Guard against a bank growing unbounded through admin additions. */
const MAX_TRACKED = 500;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKey(trainerType: DmTrainerType, userId: string | null): string {
  return `${KEY_PREFIX}:${userId ?? "guest"}:${trainerType}`;
}

export function loadSeenQuestionIds(
  trainerType: DmTrainerType,
  userId: string | null,
): Set<string> {
  if (!hasStorage()) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(trainerType, userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function markQuestionsSeen(
  trainerType: DmTrainerType,
  userId: string | null,
  questionIds: string[],
): void {
  if (!hasStorage() || questionIds.length === 0) return;
  try {
    const seen = loadSeenQuestionIds(trainerType, userId);
    for (const id of questionIds) seen.add(id);
    const list = [...seen].slice(-MAX_TRACKED);
    window.localStorage.setItem(storageKey(trainerType, userId), JSON.stringify(list));
  } catch {
    // A full or unavailable store just means repeats stay possible.
  }
}

export function clearSeenQuestionIds(
  trainerType: DmTrainerType,
  userId: string | null,
): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(storageKey(trainerType, userId));
  } catch {
    // Nothing to do: the next drill simply draws from the whole bank.
  }
}
