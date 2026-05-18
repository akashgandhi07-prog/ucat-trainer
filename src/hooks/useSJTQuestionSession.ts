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
      // Only silently discard if WE deliberately aborted (navigation away, reset, etc.)
      if (controller.signal.aborted) return;
      // Everything else - network errors, timeouts, unexpected abort-shaped errors - surface as errors
      setError(
        !isAbortError(e) && e instanceof Error
          ? e.message
          : "Failed to load question. Please check your connection and try again.",
      );
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

  // Recover from BFCache restoration (browser back/forward) or tab re-focus while stuck loading
  useEffect(() => {
    const retry = () => {
      if (loadAbortRef.current?.signal.aborted === false && !question) {
        // Still loading but question never arrived - re-trigger
        void loadInitial();
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void loadInitial(); // page restored from BFCache
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") retry();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadInitial, question]);

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
      if (controller.signal.aborted) return;
      setError(
        !isAbortError(e) && e instanceof Error
          ? e.message
          : "Failed to load question. Please check your connection and try again.",
      );
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
