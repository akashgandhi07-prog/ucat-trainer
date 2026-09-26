import { supabase } from './supabase'
import { withRetry } from './retry'
import { supabaseLog } from './logger'
import { deriveSkillReviewState } from './skillTrainerReview'

export type SkillTrainerKey = 'qr_setup' | 'qr_extraction' | 'qr_estimation' | 'dm_constraints'

export type SkillAttempt = {
  clientAttemptId: string
  clientSessionId: string
  itemId: string
  score: number
  max: number
  seconds: number
  components: Record<string, boolean>
  difficulty?: string
  skillTags?: string[]
  mistakeCause?: MistakeCause
  /** Answered in explicit "Review mistakes" mode; a correct review answer counts as one of the two steps needed to clear the item. */
  review?: boolean
  at: string
}

export type MistakeCause = 'misread' | 'method' | 'calculation' | 'unit' | 'rushed' | 'guessed' | 'changed_answer'

type Store = Partial<Record<SkillTrainerKey, SkillAttempt[]>>

const GUEST_KEY = 'guest_skill_trainer_attempts_v2'
const USER_PREFIX = 'skill_trainer_attempts_v2:'
const OUTBOX_PREFIX = 'skill_trainer_attempt_outbox_v2:'
const PLAN_REFRESH_COUNT_PREFIX = 'skill_trainer_plan_refresh_count_v2:'
const LEGACY_KEY = 'ucat_skill_trainer_progress_v1'
const MAX_LOCAL_ATTEMPTS_PER_TRAINER = 500
const MAX_CLOUD_ATTEMPTS = 1000
const UPLOAD_CHUNK_SIZE = 200
const REVIEW_TAG = 'review'

const keyFor = (userId?: string | null) => userId ? `${USER_PREFIX}${userId}` : GUEST_KEY
const outboxKeyFor = (userId: string) => `${OUTBOX_PREFIX}${userId}`

function readRaw(key: string): Store {
  if (typeof window === 'undefined') return {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const source = parsed as Record<string, unknown>
    const store: Store = {}
    for (const type of ['qr_setup', 'qr_extraction', 'qr_estimation', 'dm_constraints'] as SkillTrainerKey[]) {
      if (!Array.isArray(source[type])) continue
      store[type] = source[type].filter((value): value is SkillAttempt => {
        if (!value || typeof value !== 'object') return false
        const attempt = value as Partial<SkillAttempt>
        return typeof attempt.clientAttemptId === 'string'
          && typeof attempt.clientSessionId === 'string'
          && typeof attempt.itemId === 'string'
          && typeof attempt.score === 'number'
          && typeof attempt.max === 'number'
          && typeof attempt.at === 'string'
          && Boolean(attempt.components && typeof attempt.components === 'object')
      })
    }
    return store
  } catch {
    return {}
  }
}

function writeRaw(key: string, store: Store): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(store))
    return true
  } catch (error) {
    // A blocked/full browser store must not prevent an authenticated cloud write.
    supabaseLog.error('skill_attempt_local_write_failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

function incrementPlanRefreshCount(userId: string): number {
  if (typeof window === 'undefined') return 0
  const key = `${PLAN_REFRESH_COUNT_PREFIX}${userId}`
  try {
    const next = (Number.parseInt(localStorage.getItem(key) ?? '0', 10) || 0) + 1
    localStorage.setItem(key, String(next))
    return next
  } catch {
    // The count only controls batching; losing it must not affect attempt storage.
    return 0
  }
}

function normalise(
  attempt: Omit<SkillAttempt, 'clientAttemptId'> & { clientAttemptId?: string },
): SkillAttempt {
  return {
    ...attempt,
    clientAttemptId: attempt.clientAttemptId ?? crypto.randomUUID(),
    skillTags: attempt.skillTags ?? [],
  }
}

function migrateLegacyGuest() {
  if (typeof window === 'undefined') return
  const old = readRaw(LEGACY_KEY)
  if (!Object.keys(old).length) return

  const guest = readRaw(GUEST_KEY)
  for (const type of Object.keys(old) as SkillTrainerKey[]) {
    guest[type] = [
      ...(guest[type] ?? []),
      ...(old[type] ?? []).map((attempt) => normalise({
        ...attempt,
        clientSessionId: attempt.clientSessionId ?? crypto.randomUUID(),
      })),
    ].slice(-MAX_LOCAL_ATTEMPTS_PER_TRAINER)
  }
  writeRaw(GUEST_KEY, guest)
  localStorage.removeItem(LEGACY_KEY)
}

export function getSkillAttempts(type: SkillTrainerKey, userId?: string | null) {
  migrateLegacyGuest()
  return readRaw(keyFor(userId))[type] ?? []
}

export function getSkillSummary(type: SkillTrainerKey, userId?: string | null) {
  const attempts = getSkillAttempts(type, userId)
  const latest = new Map<string, SkillAttempt>()
  const totals = new Map<string, { correct: number; total: number }>()

  attempts.forEach((attempt) => {
    latest.set(attempt.itemId, attempt)
    Object.entries(attempt.components).forEach(([name, correct]) => {
      const value = totals.get(name) ?? { correct: 0, total: 0 }
      value.total++
      if (correct) value.correct++
      totals.set(name, value)
    })
  })

  return {
    attempts,
    latest,
    components: [...totals].map(([name, value]) => ({
      name,
      ...value,
      accuracy: Math.round((value.correct / value.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy),
  }
}

// Until the skill_trainer_attempts migration is applied, every cloud call would fail.
// Detect that once, log it once, and keep attempts on the device (and in the outbox,
// so they upload after the table exists) without surfacing errors to students.
let skillTableMissing = false

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return error.code === 'PGRST205'
    || error.code === '42P01'
    || (error.message ?? '').includes('Could not find the table')
}

function noteMissingTable() {
  if (skillTableMissing) return
  skillTableMissing = true
  supabaseLog.warn('skill_trainer_attempts table unavailable; keeping skill attempts on this device')
}

type QueuedAttempt = { type: SkillTrainerKey; attempt: SkillAttempt }

function toRow(userId: string, type: SkillTrainerKey, attempt: SkillAttempt) {
  const tags = attempt.skillTags ?? []
  return {
    user_id: userId,
    client_attempt_id: attempt.clientAttemptId,
    client_session_id: attempt.clientSessionId,
    trainer_type: type,
    question_id: attempt.itemId,
    score: attempt.score,
    max_score: attempt.max,
    time_seconds: attempt.seconds,
    components: attempt.components,
    difficulty: attempt.difficulty ?? null,
    skill_tags: attempt.review && !tags.includes(REVIEW_TAG) ? [...tags, REVIEW_TAG] : tags,
    ...(attempt.mistakeCause ? { mistake_cause: attempt.mistakeCause } : {}),
    created_at: attempt.at,
  }
}

/**
 * Idempotent batched upsert. Resolves true when every row was written, false when the
 * table is missing (rows stay queued locally), and throws on any other failure.
 */
async function cloudWriteMany(userId: string, entries: QueuedAttempt[]): Promise<boolean> {
  for (let i = 0; i < entries.length; i += UPLOAD_CHUNK_SIZE) {
    if (skillTableMissing) return false
    const rows = entries.slice(i, i + UPLOAD_CHUNK_SIZE).map(({ type, attempt }) => toRow(userId, type, attempt))
    await withRetry(async () => {
      const { error } = await supabase
        .from('skill_trainer_attempts')
        .upsert(rows, { onConflict: 'user_id,client_attempt_id' })
      if (error && isMissingTableError(error)) {
        noteMissingTable()
        return
      }
      if (error) throw error
    })
  }
  return !skillTableMissing
}

function cloudWrite(userId: string, type: SkillTrainerKey, attempt: SkillAttempt) {
  return cloudWriteMany(userId, [{ type, attempt }])
}

function removeMatchingOutboxAttempts(userId: string, written: QueuedAttempt[]) {
  if (!written.length) return
  const outboxKey = outboxKeyFor(userId)
  const outbox = readRaw(outboxKey)
  for (const { type, attempt } of written) {
    outbox[type] = (outbox[type] ?? []).filter((queued) => (
      queued.clientAttemptId !== attempt.clientAttemptId
      // Keep a newer annotation that raced with an older base-attempt write.
      || queued.mistakeCause !== attempt.mistakeCause
    ))
  }
  writeRaw(outboxKey, outbox)
}

function removeMatchingOutboxAttempt(userId: string, type: SkillTrainerKey, written: SkillAttempt) {
  removeMatchingOutboxAttempts(userId, [{ type, attempt: written }])
}

/**
 * Save locally before attempting the network write. The local user cache acts as an
 * outbox: every hydration replays it with an idempotent upsert before reading cloud
 * history, so a closed tab or temporary outage cannot silently lose an attempt.
 */
export async function saveSkillAttempt(
  type: SkillTrainerKey,
  input: Omit<SkillAttempt, 'clientAttemptId'> & { clientAttemptId?: string },
  userId?: string | null,
) {
  const attempt = normalise(input)
  const key = keyFor(userId)
  const store = readRaw(key)
  const duplicate = (store[type] ?? []).find((saved) => (
    saved.clientSessionId === attempt.clientSessionId
    && saved.itemId === attempt.itemId
    && Math.abs(new Date(saved.at).getTime() - new Date(attempt.at).getTime()) < 2_000
    && JSON.stringify(saved.components) === JSON.stringify(attempt.components)
  ))
  if (duplicate) return duplicate

  store[type] = [...(store[type] ?? []), attempt].slice(-MAX_LOCAL_ATTEMPTS_PER_TRAINER)
  writeRaw(key, store)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('skill-trainer-progress-updated'))

  if (userId) {
    const outbox = readRaw(outboxKeyFor(userId))
    outbox[type] = [...(outbox[type] ?? []), attempt]
    writeRaw(outboxKeyFor(userId), outbox)
    try {
      // A missing table leaves the attempt queued in the outbox for a later replay.
      if (!(await cloudWrite(userId, type, attempt))) return attempt
      removeMatchingOutboxAttempt(userId, type, attempt)
      const attemptCount = incrementPlanRefreshCount(userId)
      // Rebalance only after a useful batch. This avoids rewriting future weeks after
      // every click while still making trainer evidence affect the plan promptly.
      if (attemptCount > 0 && attemptCount % 5 === 0) {
        void import('../planner/lib/planner-client')
          .then(({ refreshPlanFromSkillTrainerEvidence }) => (
            refreshPlanFromSkillTrainerEvidence(userId)
          ))
          .catch((error: unknown) => {
            supabaseLog.error('skill_attempt_plan_refresh_failed', {
              message: error instanceof Error ? error.message : String(error),
            })
          })
      }
    } catch (error) {
      supabaseLog.error('skill_attempt_save_failed', {
        type,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return attempt
}

export function selectSkillItems<T extends { id: string }>(
  type: SkillTrainerKey,
  bank: readonly T[],
  count: number,
  review = false,
  userId?: string | null,
) {
  const latest = getSkillSummary(type, userId).latest
  // Review mode shows mistakes that are due first; only when none are due does it fall
  // back to not-yet-due mistakes. A correct answer in review mode is one of two steps needed
  // to clear the item (see deriveSkillReviewState).
  const reviewIds = review ? new Set(getSkillReviewIds(type, userId)) : null
  let pool: T[] = review
    ? bank.filter((question) => reviewIds?.has(question.id))
    : bank.filter((question) => !latest.has(question.id))

  if (pool.length < count && !review) pool = [...bank]
  if (review && pool.length === 0) pool = bank.filter((question) => !latest.has(question.id))
  if (pool.length === 0) pool = [...bank]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(count, pool.length))
}

const SKILL_TRAINER_TYPES: SkillTrainerKey[] = ['qr_setup', 'qr_extraction', 'qr_estimation', 'dm_constraints']
export type SkillReviewItem = {
  type: SkillTrainerKey
  itemId: string
  due: number
  successes: number
}

export function getSkillReviewState(userId?: string | null, now = Date.now()) {
  const attempts = Object.fromEntries(
    SKILL_TRAINER_TYPES.map((type) => [type, getSkillAttempts(type, userId)]),
  ) as Record<SkillTrainerKey, SkillAttempt[]>
  return deriveSkillReviewState(attempts, SKILL_TRAINER_TYPES, now)
}

/** Item ids "Review mistakes" will show for a trainer: due items, else all pending ones. */
export function getSkillReviewIds(type: SkillTrainerKey, userId?: string | null, now = Date.now()) {
  const state = getSkillReviewState(userId, now)
  const due = state.due.filter((item) => item.type === type)
  return (due.length ? due : state.pending.filter((item) => item.type === type)).map((item) => item.itemId)
}

export function recommendSkillTrainer(userId?: string | null): SkillTrainerKey {
  return SKILL_TRAINER_TYPES.map((type) => {
    const attempts = getSkillAttempts(type, userId)
    const score = attempts.reduce((sum, attempt) => sum + attempt.score, 0)
    const max = attempts.reduce((sum, attempt) => sum + attempt.max, 0)
    return { type, count: attempts.length, accuracy: max > 0 ? score / max : 1 }
  }).sort((a, b) => a.count - b.count || a.accuracy - b.accuracy)[0].type
}

export async function annotateLatestSkillAttempt(
  type: SkillTrainerKey,
  clientSessionId: string,
  itemId: string,
  mistakeCause: MistakeCause,
  userId?: string | null,
) {
  const key = keyFor(userId)
  const store = readRaw(key)
  const attempts = store[type] ?? []
  let index = -1
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].clientSessionId === clientSessionId && attempts[i].itemId === itemId) {
      index = i
      break
    }
  }
  if (index < 0) return false
  const updated = { ...attempts[index], mistakeCause }
  attempts[index] = updated
  store[type] = attempts
  writeRaw(key, store)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('skill-trainer-progress-updated'))
  if (!userId) return true

  try {
    if (await cloudWrite(userId, type, updated)) {
      removeMatchingOutboxAttempt(userId, type, updated)
      return true
    }
  } catch {
    // Fall through and queue it.
  }
  // Queue the entire idempotent row; hydration will upsert the annotation as well.
  const outbox = readRaw(outboxKeyFor(userId))
  outbox[type] = [...(outbox[type] ?? []).filter((row) => row.clientAttemptId !== updated.clientAttemptId), updated]
  writeRaw(outboxKeyFor(userId), outbox)
  return false
}

function flatten(store: Store): QueuedAttempt[] {
  return (Object.keys(store) as SkillTrainerKey[])
    .flatMap((type) => (store[type] ?? []).map((attempt) => ({ type, attempt })))
}

async function replayUserOutbox(userId: string) {
  const queued = flatten(readRaw(outboxKeyFor(userId)))
  if (!queued.length) return
  if (await cloudWriteMany(userId, queued)) removeMatchingOutboxAttempts(userId, queued)
}

async function hydrateSkillAttempts(userId: string) {
  // The upsert is idempotent, so replay cached attempts before loading cloud history.
  await replayUserOutbox(userId)
  if (skillTableMissing) return

  const { data, error } = await supabase
    .from('skill_trainer_attempts')
    .select('client_attempt_id,client_session_id,trainer_type,question_id,score,max_score,time_seconds,components,difficulty,skill_tags,mistake_cause,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_CLOUD_ATTEMPTS)
  if (error && isMissingTableError(error)) {
    noteMissingTable()
    return
  }
  if (error) throw error

  const store = readRaw(keyFor(userId))
  for (const row of [...(data ?? [])].reverse()) {
    const type = row.trainer_type as SkillTrainerKey
    const attempt: SkillAttempt = {
      clientAttemptId: row.client_attempt_id,
      clientSessionId: row.client_session_id,
      itemId: row.question_id,
      score: row.score,
      max: row.max_score,
      seconds: row.time_seconds,
      components: row.components as Record<string, boolean>,
      difficulty: row.difficulty ?? undefined,
      skillTags: row.skill_tags ?? [],
      mistakeCause: row.mistake_cause ?? undefined,
      review: (row.skill_tags ?? []).includes(REVIEW_TAG) || undefined,
      at: row.created_at,
    }
    const withoutDuplicate = (store[type] ?? []).filter(
      (cached) => cached.clientAttemptId !== attempt.clientAttemptId,
    )
    store[type] = [...withoutDuplicate, attempt]
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-MAX_LOCAL_ATTEMPTS_PER_TRAINER)
  }
  writeRaw(keyFor(userId), store)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('skill-trainer-progress-updated'))
}

// One cloud hydration per user per page load. supabase-js re-emits SIGNED_IN on every
// tab refocus, and INITIAL_SESSION also triggers a sync, so without this guard each
// event would re-run the outbox replay and the 1,000-row select.
const syncByUser = new Map<string, Promise<void>>()

/** Replay the offline outbox and pull cloud history once per user per page load. */
export function syncSkillAttempts(userId: string): Promise<void> {
  const existing = syncByUser.get(userId)
  if (existing) return existing
  const run = hydrateSkillAttempts(userId).catch((error: unknown) => {
    // Let a later auth event retry after a transient failure.
    syncByUser.delete(userId)
    throw error
  })
  syncByUser.set(userId, run)
  return run
}

/**
 * Move guest attempts into the signed-in user's local cache and outbox (so nothing is
 * lost if the upload fails), then upload them in batches and hydrate cloud history.
 */
export async function migrateGuestSkillAttempts(userId: string) {
  migrateLegacyGuest()
  const guest = readRaw(GUEST_KEY)
  const moved = flatten(guest)
  if (moved.length) {
    const userKey = keyFor(userId)
    const store = readRaw(userKey)
    const outbox = readRaw(outboxKeyFor(userId))
    for (const { type, attempt } of moved) {
      store[type] = [...(store[type] ?? []).filter((row) => row.clientAttemptId !== attempt.clientAttemptId), attempt]
      outbox[type] = [...(outbox[type] ?? []).filter((row) => row.clientAttemptId !== attempt.clientAttemptId), attempt]
    }
    for (const type of Object.keys(store) as SkillTrainerKey[]) {
      store[type] = (store[type] ?? []).sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_LOCAL_ATTEMPTS_PER_TRAINER)
    }
    // Only drop the guest copy once the outbox holds it.
    if (writeRaw(outboxKeyFor(userId), outbox)) {
      writeRaw(userKey, store)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(GUEST_KEY)
        window.dispatchEvent(new Event('skill-trainer-progress-updated'))
      }
    } else {
      // Browser storage is unavailable: upload directly and keep the guest copy on failure.
      if (await cloudWriteMany(userId, moved) && typeof window !== 'undefined') localStorage.removeItem(GUEST_KEY)
    }
  }
  const alreadySynced = syncByUser.has(userId)
  await syncSkillAttempts(userId)
  // A sync that ran earlier in this page load did not see the guest rows just queued.
  if (moved.length && alreadySynced) await replayUserOutbox(userId)
}
