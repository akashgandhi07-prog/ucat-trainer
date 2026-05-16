import { useState, useCallback, useRef, useEffect } from "react";
import { fetchRandomSJTQuestion } from "../lib/sjtApi";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";

export function useSJTQuestionSession(type: SJTQuestionType) {
  const [question, setQuestion] = useState<SJTQuestion | null>(null);
  const [prefetched, setPrefetched] = useState<SJTQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<string[]>([]);
  const prefetchingRef = useRef(false);

  const fetchOne = useCallback(
    async (excludeIds: string[]) => {
      return fetchRandomSJTQuestion(type, excludeIds);
    },
    [type],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchOne(seenIdsRef.current);
      setQuestion(q);
      if (q) {
        seenIdsRef.current = [...seenIdsRef.current, q.id];
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load question.");
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [fetchOne]);

  const prefetchNext = useCallback(async () => {
    if (prefetchingRef.current || prefetched) return;
    prefetchingRef.current = true;
    try {
      const q = await fetchOne(seenIdsRef.current);
      setPrefetched(q);
    } catch {
      setPrefetched(null);
    } finally {
      prefetchingRef.current = false;
    }
  }, [fetchOne, prefetched]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const advanceToNext = useCallback(async () => {
    if (prefetched) {
      setQuestion(prefetched);
      seenIdsRef.current = [...seenIdsRef.current, prefetched.id];
      setPrefetched(null);
      void prefetchNext();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = await fetchOne(seenIdsRef.current);
      setQuestion(q);
      if (q) {
        seenIdsRef.current = [...seenIdsRef.current, q.id];
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load question.");
    } finally {
      setLoading(false);
    }
  }, [prefetched, fetchOne, prefetchNext]);

  const resetSession = useCallback(() => {
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
