import type { GMCDomainId, SJTQuestionType } from "../types/sjt";
import { recordSJTAttempt } from "./sjtAnalytics";
import { persistSJTSession } from "./sjtSessionStorage";
import { trackEvent } from "./analytics";
import {
  migrateGuestSJTScenariosWith,
  resolveSJTResumeWith,
  settleActiveSJTScenario,
  settleStaleSJTScenariosWith,
  sjtDraftScope,
  sjtTabId,
  writeOwnedSJTScenario,
  type ActiveSJTScenario,
  type ActiveSJTScenarioInput,
  type SJTPointerWrite,
  type SJTScenarioFilters,
  type SJTScenarioProgress,
} from "./sjtDraftRecovery";

/** Records one abandoned (partial) attempt locally and to guest storage or the cloud. */
export function recordSJTPartialAttempt(
  userId: string | null,
  scenario: { questionId: string; type: string; domain: string },
  progress: SJTScenarioProgress,
): void {
  const type = scenario.type as SJTQuestionType;
  const domain = scenario.domain as GMCDomainId;
  void trackEvent("sjt_scenario_abandoned", {
    question_id: scenario.questionId,
    question_type: type,
    domain,
    items_attempted: progress.itemsAttempted,
    items_total: progress.itemsTotal,
  });
  recordSJTAttempt({ questionId: scenario.questionId, domain, type, score: progress.partialScore, maxScore: progress.itemsTotal });
  void persistSJTSession(userId, {
    question_id: scenario.questionId,
    question_type: type,
    domain,
    score: progress.partialScore,
    max_score: progress.itemsTotal,
    items_attempted: progress.itemsAttempted,
    items_total: progress.itemsTotal,
    completed: false,
  });
}

/** Discards the active scenario (only that attempt, when attemptId is given) and records its partial attempt, once. */
export function settleAbandonedSJTScenario(scope: string | null, type: string, questionId?: string, attemptId?: string): ActiveSJTScenario | null {
  return settleActiveSJTScenario(scope, type, questionId, recordSJTPartialAttempt, attemptId);
}

/**
 * Sign-in: moves any half-finished guest scenario to the account (so it resumes
 * there), or records its partial once to the account. Synchronous apart from the
 * upload, and safe to call repeatedly.
 */
export function migrateGuestSJTScenarios(userId: string | null): number {
  return migrateGuestSJTScenariosWith(userId, recordSJTPartialAttempt);
}

/** SJT hub or Dashboard load: settle pointers no tab is showing, or that have expired. */
export function settleStaleSJTScenarios(userId: string | null): number {
  if (userId) migrateGuestSJTScenarios(userId);
  return settleStaleSJTScenariosWith(sjtDraftScope(userId), recordSJTPartialAttempt);
}

/** On opening a trainer: the scenario to reopen (now owned by this tab), or null (stale pointers are settled). */
export function resolveSJTResume(scope: string | null, type: string, filters: SJTScenarioFilters, now = Date.now()): ActiveSJTScenario | null {
  // Full-page sign-ins (OAuth redirects) never see SIGNED_IN, so guest scenarios are also picked up here.
  if (scope && scope !== "guest") migrateGuestSJTScenarios(scope);
  return resolveSJTResumeWith(scope, type, filters, recordSJTPartialAttempt, now, sjtTabId());
}

/** Writes this tab's pointer for the attempt it is showing (see writeOwnedSJTScenario). */
export function writeOwnedActiveSJTScenario(
  scope: string | null,
  value: Omit<ActiveSJTScenarioInput, "owner" | "aliveAt"> & { attemptId: string },
  previouslyOwned: boolean,
): SJTPointerWrite {
  return writeOwnedSJTScenario(scope, value, { tabId: sjtTabId(), previouslyOwned, record: recordSJTPartialAttempt });
}
