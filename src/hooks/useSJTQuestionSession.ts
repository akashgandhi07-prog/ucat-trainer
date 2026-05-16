import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRandomSJTQuestion, isAbortError } from "../lib/sjtApi";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";

export function useSJTQuestionSession(type: SJTQuestionType) {
  const [question, setQuestion] = useState<SJTQuestion | null>(null);
  const [prefetched, setPrefetched] = useState<SJTQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<string[]>([]);
  const prefetchingRef = useRef(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  const fetchOne = useCallback(
    async (excludeIds: string[], signal?: AbortSignal) => {
      return fetchRandomSJTQuestion(type, excludeIds, signal);
    },
    [type],
  );

  const loadInitial = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const q = await fetchOne(seenIdsRef.current, controller.signal);
      if (controller.signal.aborted) return;
      setQuestion(q);
      if (q) {
        seenIdsRef.current = [...seenIdsRef.current, q.id];
      }
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e)) return;
      setError(e instanceof Error ? e.message : "Failed to load question.");
      setQuestion(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchOne]);

  const prefetchNext = useCallback(async () => {
    if (prefetchingRef.current || prefetched) return;

    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    prefetchingRef.current = true;

    try {
      const q = await fetchOne(seenIdsRef.current, controller.signal);
      if (controller.signal.aborted) return;
      setPrefetched(q);
    } catch {
      if (!controller.signal.aborted) {
        setPrefetched(null);
      }
    } finally {
      prefetchingRef.current = false;
    }
  }, [fetchOne, prefetched]);

  useEffect(() => {
    seenIdsRef.current = [];
    setPrefetched(null);
    void loadInitial();

    return () => {
      loadAbortRef.current?.abort();
      prefetchAbortRef.current?.abort();
    };
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps -- remount when trainer type changes only

  const advanceToNext = useCallback(async () => {
    if (prefetched) {
      setQuestion(prefetched);
      seenIdsRef.current = [...seenIdsRef.current, prefetched.id];
      setPrefetched(null);
      void prefetchNext();
      return;
    }

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const q = await fetchOne(seenIdsRef.current, controller.signal);
      if (controller.signal.aborted) return;
      setQuestion(q);
      if (q) {
        seenIdsRef.current = [...seenIdsRef.current, q.id];
      }
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e)) return;
      setError(e instanceof Error ? e.message : "Failed to load question.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [prefetched, fetchOne, prefetchNext]);

  const resetSession = useCallback(() => {
    loadAbortRef.current?.abort();
    prefetchAbortRef.current?.abort();
    seenIdsRef.current = [];
    setPrefetched(null);
    setQuestion(null);
    setError(null);
    void loadInitial();
  }, [loadInitial]);

  return {
    question,
    loading,
    error,
    loadInitial,
    prefetchNext,
    advanceToNext,
    resetSession,
    retry: loadInitial,
  };
}
