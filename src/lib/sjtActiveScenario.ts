import type { GMCDomainId, SJTQuestionType } from "../types/sjt";
import { recordSJTAttempt } from "./sjtAnalytics";
import { persistSJTSession } from "./sjtSessionStorage";
import { trackEvent } from "./analytics";
import {
  resolveSJTResumeWith,
  settleActiveSJTScenario,
  type ActiveSJTScenario,
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

/** Discards the active scenario and records its partial attempt, once. */
export function settleAbandonedSJTScenario(scope: string | null, type: string, questionId?: string): ActiveSJTScenario | null {
  return settleActiveSJTScenario(scope, type, questionId, recordSJTPartialAttempt);
}

/** On opening a trainer: the scenario to reopen, or null (stale pointers are settled). */
export function resolveSJTResume(scope: string | null, type: string, filters: SJTScenarioFilters, now = Date.now()): ActiveSJTScenario | null {
  return resolveSJTResumeWith(scope, type, filters, recordSJTPartialAttempt, now);
}
