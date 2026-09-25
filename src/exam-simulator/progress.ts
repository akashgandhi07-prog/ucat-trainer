import { supabase } from "../lib/supabase";
import { complete } from "./model";
import type { Answer, Bank } from "./model";

export type AttemptPhase = "instructions" | "question" | "review" | "finished";

export type AttemptSnapshot = {
  attemptId: string;
  bank: Bank;
  phase: AttemptPhase;
  sectionIndex: number;
  index: number;
  answers: Record<string, Answer>;
  seen: string[];
  flags: string[];
  deadline: number;
  multiplier: number;
  timed: boolean;
  scheme: string;
  startedAt: string;
  updatedAt: string;
  /** Local copies only: the signed-in user who owned the attempt, or null for guests. */
  ownerId?: string | null;
};

export type AttemptSummary = {
  answered: number;
  total: number;
  correct: number;
  scorable: number;
  sections: Record<
    string,
    { answered: number; total: number; correct: number; scorable: number }
  >;
};

const LOCAL_PREFIX = "ucat-exam-attempt-v2:";
const ACTIVE_KEY = "ucat-exam-active-attempt-v2";
const HISTORY_KEY = "ucat-exam-attempt-history-v2";

function answerMatches(expected: Answer, actual: Answer) {
  const keys = Object.keys(expected);
  return keys.length > 0 && keys.every((key) => expected[key] === actual[key]);
}

export function summariseAttempt(
  bank: Bank,
  answers: Record<string, Answer>,
): AttemptSummary {
  const summary: AttemptSummary = {
    answered: 0,
    total: 0,
    correct: 0,
    scorable: 0,
    sections: {},
  };
  for (const section of bank.sections) {
    const sectionSummary = {
      answered: 0,
      total: section.questions.length,
      correct: 0,
      scorable: 0,
    };
    for (const question of section.questions) {
      const answer = answers[question.id] ?? {};
      if (complete(question, answer)) sectionSummary.answered++;
      if (question.correctAnswer) {
        sectionSummary.scorable++;
        if (answerMatches(question.correctAnswer, answer))
          sectionSummary.correct++;
      }
    }
    summary.sections[section.id] = sectionSummary;
    summary.answered += sectionSummary.answered;
    summary.total += sectionSummary.total;
    summary.correct += sectionSummary.correct;
    summary.scorable += sectionSummary.scorable;
  }
  return summary;
}

export function readLocalAttempt(): AttemptSnapshot | null {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    return JSON.parse(
      localStorage.getItem(`${LOCAL_PREFIX}${id}`) ?? "null",
    ) as AttemptSnapshot | null;
  } catch {
    return null;
  }
}

const HISTORY_LIMIT = 30;

function readHistoryIds(): string[] {
  try {
    const ids = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function readLocalSnapshot(id: string): AttemptSnapshot | null {
  try {
    return JSON.parse(
      localStorage.getItem(`${LOCAL_PREFIX}${id}`) ?? "null",
    ) as AttemptSnapshot | null;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/** Removes the oldest completed attempts (never `keepId`). Returns how many were removed. */
function pruneCompletedAttempts(keepId: string, count: number) {
  const ids = readHistoryIds();
  const completed = ids
    .filter((id) => id !== keepId)
    .filter((id) => readLocalSnapshot(id)?.phase === "finished")
    .reverse(); // History is newest first.
  const doomed = new Set(completed.slice(0, count));
  for (const id of doomed) localStorage.removeItem(`${LOCAL_PREFIX}${id}`);
  if (doomed.size)
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(ids.filter((id) => !doomed.has(id))),
    );
  return doomed.size;
}

function writeLocalOnce(snapshot: AttemptSnapshot, ownerId: string | null) {
  // Snapshot first, then the history index, then the active pointer, so the
  // pointer never refers to a snapshot that failed to save.
  localStorage.setItem(
    `${LOCAL_PREFIX}${snapshot.attemptId}`,
    JSON.stringify({ ...snapshot, ownerId }),
  );
  const ids = [
    snapshot.attemptId,
    ...readHistoryIds().filter((id) => id !== snapshot.attemptId),
  ];
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(ids.slice(0, HISTORY_LIMIT)),
  );
  for (const id of ids.slice(HISTORY_LIMIT))
    localStorage.removeItem(`${LOCAL_PREFIX}${id}`);
  if (snapshot.phase !== "finished")
    localStorage.setItem(ACTIVE_KEY, snapshot.attemptId);
}

/** Saves the attempt in this browser. Returns false when it could not be stored. */
function writeLocal(snapshot: AttemptSnapshot, ownerId: string | null) {
  try {
    writeLocalOnce(snapshot, ownerId);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) {
      console.warn("Exam attempt could not be saved on this device.", error);
      return false;
    }
  }
  try {
    if (pruneCompletedAttempts(snapshot.attemptId, 5) === 0)
      throw new Error("No completed attempts to prune.");
    writeLocalOnce(snapshot, ownerId);
    return true;
  } catch (error) {
    console.warn(
      "Exam attempt could not be saved on this device: storage is full.",
      error,
    );
    return false;
  }
}

export function clearActiveAttempt() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Storage may be blocked; nothing to clear.
  }
}

/** Removes every attempt saved on this device by `userId` (used on sign-out). */
export function clearLocalAttemptsForUser(userId: string) {
  try {
    const ids = readHistoryIds();
    const removed = new Set(
      ids.filter((id) => readLocalSnapshot(id)?.ownerId === userId),
    );
    for (const id of removed) localStorage.removeItem(`${LOCAL_PREFIX}${id}`);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(ids.filter((id) => !removed.has(id))),
    );
    const active = localStorage.getItem(ACTIVE_KEY);
    if (active && removed.has(active)) localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Storage may be blocked; nothing to clear.
  }
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function saveAttempt(
  snapshot: AttemptSnapshot,
  userId: string | null,
  options: { cloud?: boolean } = {},
) {
  const local = writeLocal(snapshot, userId);
  if (!userId || options.cloud === false)
    return {
      local,
      cloud: false,
      error: local ? null : "Storage on this device is full.",
    };
  const { ownerId: _ownerId, ...state } = snapshot;
  void _ownerId;
  const summary = summariseAttempt(snapshot.bank, snapshot.answers);
  const { error } = await supabase.from("exam_attempts").upsert(
    {
      user_id: userId,
      client_attempt_id: snapshot.attemptId,
      bank_title: snapshot.bank.title,
      status: snapshot.phase === "finished" ? "completed" : "in_progress",
      current_section:
        snapshot.bank.sections[snapshot.sectionIndex]?.id ?? null,
      current_question: snapshot.index,
      timed: snapshot.timed,
      time_multiplier: snapshot.multiplier,
      started_at: snapshot.startedAt,
      completed_at: snapshot.phase === "finished" ? snapshot.updatedAt : null,
      answered_count: summary.answered,
      total_questions: summary.total,
      correct_count: summary.correct,
      scorable_count: summary.scorable,
      section_results: summary.sections,
      state,
      updated_at: snapshot.updatedAt,
    },
    { onConflict: "user_id,client_attempt_id" },
  );
  return { local, cloud: !error, error: error?.message ?? null };
}

export async function loadLatestCloudAttempt(
  userId: string,
): Promise<AttemptSnapshot | null> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("state")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.state) return null;
  return data.state as AttemptSnapshot;
}

export type AttemptHistoryItem = {
  attemptId: string;
  bankTitle: string;
  status: "in_progress" | "completed";
  updatedAt: string;
  answered: number;
  total: number;
  correct: number;
  scorable: number;
};

function localHistory(): AttemptHistoryItem[] {
  try {
    const ids = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]",
    ) as string[];
    return ids.flatMap((id) => {
      const value = JSON.parse(
        localStorage.getItem(`${LOCAL_PREFIX}${id}`) ?? "null",
      ) as AttemptSnapshot | null;
      if (!value) return [];
      const result = summariseAttempt(value.bank, value.answers);
      return [
        {
          attemptId: value.attemptId,
          bankTitle: value.bank.title,
          status:
            value.phase === "finished"
              ? ("completed" as const)
              : ("in_progress" as const),
          updatedAt: value.updatedAt,
          answered: result.answered,
          total: result.total,
          correct: result.correct,
          scorable: result.scorable,
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function listAttemptHistory(
  userId: string | null,
): Promise<AttemptHistoryItem[]> {
  if (!userId) return localHistory();
  const { data, error } = await supabase
    .from("exam_attempts")
    .select(
      "client_attempt_id,bank_title,status,updated_at,answered_count,total_questions,correct_count,scorable_count",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) return localHistory();
  return data.map((row) => ({
    attemptId: row.client_attempt_id,
    bankTitle: row.bank_title,
    status: row.status as "in_progress" | "completed",
    updatedAt: row.updated_at,
    answered: row.answered_count,
    total: row.total_questions,
    correct: row.correct_count,
    scorable: row.scorable_count,
  }));
}
