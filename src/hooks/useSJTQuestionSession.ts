import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRandomSJTQuestion, isAbortError, type SJTPracticeFilters } from "../lib/sjtApi";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";

export type SJTResumeStatus = "none" | "resumed" | "failed";

/**
 * @param resumeQuestionId When set, the first load reopens this scenario (a
 *   half-finished one after a reload) instead of a random one. If it cannot be
 *   loaded, resumeStatus becomes "failed" and a normal scenario loads instead.
 */
export function useSJTQuestionSession(
  type: SJTQuestionType,
  enabled = true,
  filters: SJTPracticeFilters = {},
  resumeQuestionId: string | null = null,
) {
  const [question, setQuestion] = useState<SJTQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeStatus, setResumeStatus] = useState<SJTResumeStatus>("none");
  const seen = useRef<string[]>([]);
  const pending = useRef<AbortController | null>(null);
  // Only the first completed load may resume; later loads are always new scenarios.
  const resumeDone = useRef(false);
  const { domain, difficulty, questionId } = filters;
  const load = useCallback(async () => {
    if (!enabled) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setError(null); setQuestion(null);
    try {
      const resumeId = !questionId && !resumeDone.current ? resumeQuestionId : null;
      if (resumeId) {
        let resumed: SJTQuestion | null = null;
        try {
          resumed = await fetchRandomSJTQuestion(type, [], controller.signal, 0, { questionId: resumeId });
        } catch (e) {
          if (isAbortError(e) || controller.signal.aborted) return;
        }
        if (controller.signal.aborted) return;
        resumeDone.current = true;
        if (resumed && resumed.id === resumeId && resumed.type === type) {
          setQuestion(resumed);
          seen.current = [...seen.current, resumed.id].slice(-1000);
          setResumeStatus("resumed");
          return;
        }
        setResumeStatus("failed");
      } else if (!controller.signal.aborted) {
        resumeDone.current = true;
      }
      const selection = { domain, difficulty, questionId };
      let q = await fetchRandomSJTQuestion(type, questionId ? [] : seen.current, controller.signal, 0, selection);
      if (!q && !questionId && seen.current.length && !controller.signal.aborted) {
        seen.current = [];
        q = await fetchRandomSJTQuestion(type, [], controller.signal, 0, selection);
      }
      if (controller.signal.aborted) return;
      setQuestion(q);
      if (q && !questionId) seen.current = [...seen.current, q.id].slice(-1000);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load a scenario. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [type, enabled, domain, difficulty, questionId, resumeQuestionId]);
  useEffect(() => {
    seen.current = [];
    void load();
    return () => pending.current?.abort();
  }, [load]);
  const resetSession = useCallback(() => { seen.current = []; void load(); }, [load]);
  return { question, loading, error, resumeStatus, advanceToNext: load, resetSession, retry: load };
}
