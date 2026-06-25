/**
 * Cross-session passage rotation for the local-bank VR trainers
 * (speed reading, rapid recall, keyword scanning).
 *
 * Seen passage ids are tracked per trainer in localStorage so repeat sessions
 * prefer passages the user has not practised yet. For signed-in users the
 * local sets are additionally hydrated once per page load from the sessions
 * table (passage_id column), so a new device knows the user's history.
 * When every passage has been seen, the trainer's set resets ("new cycle").
 *
 * Builds on top of the existing random picker in src/lib/passages.ts —
 * the same difficulty/category pool rules apply via getVrPassageCandidates.
 */

import { PASSAGES, type Passage } from "../data/passages";
import type { TrainingDifficulty } from "../types/training";
import { supabase } from "./supabase";
import { hiddenDistortionPassageIds } from "./questionOverrides";

export type VrTrainerType = "speed_reading" | "rapid_recall" | "keyword_scanning";

const STORAGE_KEY = "vr_seen_passages_v1";
/** Cap per trainer so the stored list stays small even as the bank grows. */
const MAX_SEEN_IDS = 300;

type SeenMap = Partial<Record<VrTrainerType, string[]>>;

function isVrTrainerType(value: unknown): value is VrTrainerType {
  return value === "speed_reading" || value === "rapid_recall" || value === "keyword_scanning";
}

function loadSeenMap(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed == null) return {};
    const map: SeenMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isVrTrainerType(key) && Array.isArray(value)) {
        map[key] = value.filter((id): id is string => typeof id === "string").slice(-MAX_SEEN_IDS);
      }
    }
    return map;
  } catch {
    return {};
  }
}

function saveSeenMap(map: SeenMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full/unavailable - degrade silently to in-session behaviour.
  }
}

/** Record that a passage was actually shown to the user in a trainer. */
export function markPassageSeen(trainerType: VrTrainerType, passageId: string): void {
  if (!passageId) return;
  const map = loadSeenMap();
  const existing = map[trainerType] ?? [];
  const next = existing.filter((id) => id !== passageId);
  next.push(passageId);
  map[trainerType] = next.slice(-MAX_SEEN_IDS);
  saveSeenMap(map);
}

export function getSeenPassageIds(trainerType: VrTrainerType): Set<string> {
  return new Set(loadSeenMap()[trainerType] ?? []);
}

function resetSeenPassages(trainerType: VrTrainerType): void {
  const map = loadSeenMap();
  delete map[trainerType];
  saveSeenMap(map);
}

// One cloud hydration per page load (per user) - repeated calls are no-ops.
let hydratePromise: Promise<void> | null = null;
let hydratedUserId: string | null = null;

/**
 * Union the signed-in user's cloud passage history into the local seen sets.
 * Fire-and-forget; failures degrade silently to local-only tracking.
 */
export function hydrateSeenFromCloud(userId: string): Promise<void> {
  if (hydratePromise && hydratedUserId === userId) return hydratePromise;
  hydratedUserId = userId;
  hydratePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("training_type, passage_id")
        .eq("user_id", userId)
        .not("passage_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error || !data) return;
      const map = loadSeenMap();
      for (const row of data as { training_type: string | null; passage_id: string | null }[]) {
        if (!isVrTrainerType(row.training_type) || !row.passage_id) continue;
        const existing = map[row.training_type] ?? [];
        if (!existing.includes(row.passage_id)) {
          existing.push(row.passage_id);
          map[row.training_type] = existing.slice(-MAX_SEEN_IDS);
        }
      }
      saveSeenMap(map);
    } catch {
      // Network/auth failure - keep local-only history.
    }
  })();
  return hydratePromise;
}

/**
 * Candidate pool with the same difficulty/category rules as
 * pickNewRandomPassage in src/lib/passages.ts (kept in sync; that file
 * does not export its pool helpers).
 */
export function getVrPassageCandidates(
  difficulty?: TrainingDifficulty,
  category?: string,
): Passage[] {
  const range: [number, number] | null =
    difficulty === "easy" ? [1, 3]
      : difficulty === "medium" ? [4, 6]
        : difficulty === "hard" ? [7, 10]
          : null;

  let pool = range == null
    ? PASSAGES
    : PASSAGES.filter((p) => p.difficulty >= range[0] && p.difficulty <= range[1]);

  if (category && category !== "all") {
    const catFiltered = pool.filter((p) => p.category === category);
    // Only apply the category filter if it yields results (matches the picker).
    if (catFiltered.length > 0) pool = catFiltered;
  }

  return pool.length > 0 ? pool : PASSAGES;
}

/**
 * Pick a passage the user has not seen yet in this trainer (random among
 * unseen). If every candidate has been seen, reset the trainer's seen set
 * ("new cycle") and pick randomly, avoiding the current passage if possible.
 */
export function pickUnseenPassage(
  trainerType: VrTrainerType,
  candidates: Passage[],
  currentId?: string | null,
): Passage {
  let source = candidates.length > 0 ? candidates : PASSAGES;

  // The Speed Reading / Rapid Recall trainers generate distortion questions from
  // a passage; an admin can hide a whole passage from that pool. Filter those out
  // (best-effort: empty until the overrides snapshot loads).
  if (trainerType === "speed_reading" || trainerType === "rapid_recall") {
    const hidden = hiddenDistortionPassageIds();
    if (hidden.size > 0) {
      const filtered = source.filter((p) => !hidden.has(p.id));
      if (filtered.length > 0) source = filtered;
    }
  }

  if (source.length === 0) {
    throw new Error("No passages available");
  }

  const seen = getSeenPassageIds(trainerType);
  const unseen = source.filter((p) => !seen.has(p.id) && p.id !== currentId);
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  // Everything in this pool has been seen - start a new cycle.
  resetSeenPassages(trainerType);
  const avoidCurrent = source.filter((p) => p.id !== currentId);
  const pool = avoidCurrent.length > 0 ? avoidCurrent : source;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Bank coverage for a trainer, e.g. { seen: 47, total: 105 }. */
export function getBankProgress(
  trainerType: VrTrainerType,
  bankSize: number,
): { seen: number; total: number } {
  const seen = getSeenPassageIds(trainerType);
  return { seen: Math.min(seen.size, bankSize), total: bankSize };
}
