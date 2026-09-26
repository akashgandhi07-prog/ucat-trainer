import { supabase } from "./supabase";
import { loadSJTReviews, loadSJTReviewStats, planSJTReviewSync, replaceSJTReviewState, type CloudSJTReviewRow, type ReviewEntry } from "./sjtReview";
import type { SJTQuestion } from "../types/sjt";

export type ReviewStoragePreference = "account" | "device";
const preferenceKey = (userId: string) => `ucat_sjt_review_storage_v1:${userId}`;

export function getReviewStoragePreference(userId: string): ReviewStoragePreference {
  try { return localStorage.getItem(preferenceKey(userId)) === "device" ? "device" : "account"; }
  catch { return "account"; }
}
export function setReviewStoragePreference(userId: string, value: ReviewStoragePreference): void {
  try { localStorage.setItem(preferenceKey(userId), value); } catch { /* local fallback remains available */ }
}

type CloudReviewRow = CloudSJTReviewRow;

const SYNC_LIMIT = 500;

export async function syncSJTReviewState(userId: string): Promise<{ synced: boolean; cleared: number }> {
  if (getReviewStoragePreference(userId) === "device") return { synced: false, cleared: loadSJTReviewStats(userId).cleared };
  const offline = () => ({ synced: false, cleared: loadSJTReviewStats(userId).cleared });
  const local = loadSJTReviews(userId);
  const columns = "question_id,question_type,domain,due_at,successes,cleared_at,updated_at";
  const localIds = [...new Set(local.map((entry) => entry.id))];
  const [activeRes, localRowsRes, clearedRes] = await Promise.all([
    // Newest active items first, so a large history never hides recent mistakes.
    supabase.from("sjt_review_items").select(columns)
      .eq("user_id", userId).is("cleared_at", null)
      .order("updated_at", { ascending: false }).limit(SYNC_LIMIT),
    // Every cloud row (active, cleared or removed) for items this device holds, so a
    // local copy is only uploaded when it is newer than what the cloud already has.
    localIds.length
      ? supabase.from("sjt_review_items").select(columns)
        .eq("user_id", userId).in("question_id", localIds)
      : Promise.resolve({ data: [] as CloudReviewRow[], error: null }),
    // Successful clears are stored with successes = 1; removals are tombstones with 0.
    supabase.from("sjt_review_items").select("question_id", { count: "exact", head: true })
      .eq("user_id", userId).not("cleared_at", "is", null).gte("successes", 1),
  ]);
  if (activeRes.error || localRowsRes.error || clearedRes.error) return offline();
  const cloudRows = [...((activeRes.data ?? []) as CloudReviewRow[]), ...((localRowsRes.data ?? []) as CloudReviewRow[])];
  const { upload, active } = planSJTReviewSync(local, cloudRows);
  if (upload.length) {
    const { error: uploadError } = await supabase.from("sjt_review_items").upsert(upload.map((entry) => ({
      user_id: userId, question_id: entry.id, question_type: entry.type, domain: entry.domain,
      due_at: new Date(entry.due).toISOString(), successes: entry.successes, cleared_at: null, updated_at: new Date().toISOString(),
    })), { onConflict: "user_id,question_id,question_type" });
    if (uploadError) return offline();
  }
  const cleared = clearedRes.count ?? loadSJTReviewStats(userId).cleared;
  replaceSJTReviewState(userId, active, cleared);
  return { synced: true, cleared };
}

/**
 * Push the review outcome of a completed scenario. `hadReviewEntry` is whether the
 * scenario was in the local review queue before this attempt, so an item cleared
 * during normal practice (not only via ?review=) is marked cleared in the cloud
 * and is not resurrected by the next sync.
 */
export async function syncSJTReviewOutcome(userId: string, question: SJTQuestion, hadReviewEntry: boolean): Promise<boolean> {
  if (getReviewStoragePreference(userId) === "device") return false;
  const active = loadSJTReviews(userId).find((entry) => entry.id === question.id && entry.type === question.type);
  if (!active && !hadReviewEntry) return true;
  const row = {
    user_id: userId, question_id: question.id, question_type: question.type, domain: question.domain,
    due_at: active ? new Date(active.due).toISOString() : null,
    successes: active?.successes ?? 1,
    cleared_at: active ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("sjt_review_items").upsert(row, { onConflict: "user_id,question_id,question_type" });
  return !error;
}

/**
 * Record that a review item was removed without being cleared (dismissed, or its
 * scenario is no longer available). Stored as a tombstone (cleared_at set,
 * successes 0) so other devices do not re-upload it and it does not count as a
 * successfully cleared mistake.
 */
export async function syncSJTReviewRemoval(userId: string, questionId: string, type: ReviewEntry["type"], domain?: ReviewEntry["domain"]): Promise<boolean> {
  if (getReviewStoragePreference(userId) === "device") return false;
  const now = new Date().toISOString();
  if (domain) {
    const { error } = await supabase.from("sjt_review_items").upsert({
      user_id: userId, question_id: questionId, question_type: type, domain,
      due_at: null, successes: 0, cleared_at: now, updated_at: now,
    }, { onConflict: "user_id,question_id,question_type" });
    return !error;
  }
  // Without a domain (e.g. the scenario could not be loaded), tombstone an existing row only.
  const { error } = await supabase.from("sjt_review_items")
    .update({ due_at: null, successes: 0, cleared_at: now, updated_at: now })
    .eq("user_id", userId).eq("question_id", questionId).eq("question_type", type);
  return !error;
}

export async function clearCloudSJTReviews(userId: string): Promise<boolean> {
  const { error } = await supabase.from("sjt_review_items").delete().eq("user_id", userId);
  return !error;
}

export async function deleteCloudSJTReview(userId: string, questionId: string, type: ReviewEntry["type"]): Promise<boolean> {
  const { error } = await supabase.from("sjt_review_items").delete()
    .eq("user_id", userId).eq("question_id", questionId).eq("question_type", type);
  return !error;
}
