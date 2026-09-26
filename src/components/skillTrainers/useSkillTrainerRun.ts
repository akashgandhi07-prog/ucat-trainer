import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { selectSkillItems, type SkillTrainerKey } from "../../lib/skillTrainerProgress";

type RunState = { sessionId: string; review: boolean; answered: boolean };

const reviewFromUrl = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("review") === "1";

/**
 * Item selection for the SkillTrainerShell trainers (QR Setup, Data Extraction, Estimation,
 * DM Constraint Builder).
 *
 * AuthContext starts with user=null until INITIAL_SESSION, so picking items on first render
 * would use the empty guest store for a signed-in student (and ?review=1 would find nothing).
 * This waits for auth to settle, then picks items, and picks again when the account changes or
 * the local progress store is refreshed by cloud hydration, but only until the first item of
 * the run has been checked. Pages call markAnswered() before saving that first attempt.
 *
 * runKey changes whenever a fresh selection is made; pages key their per-run state on it so a
 * reselection or restart starts from a clean board.
 */
export function useSkillTrainerRun<T extends { id: string }>(type: SkillTrainerKey, bank: readonly T[], count: number) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [run, setRun] = useState<RunState>(() => ({ sessionId: crypto.randomUUID(), review: reviewFromUrl(), answered: false }));
  const [progressVersion, setProgressVersion] = useState(0);
  const [picked, setPicked] = useState<{ key: string; items: T[] } | null>(null);

  useEffect(() => {
    const refresh = () => setProgressVersion((v) => v + 1);
    window.addEventListener("skill-trainer-progress-updated", refresh);
    return () => window.removeEventListener("skill-trainer-progress-updated", refresh);
  }, []);

  const key = `${run.sessionId}|${userId ?? "guest"}|${progressVersion}`;
  let items = picked?.items ?? null;
  let runKey = picked?.key ?? "loading";
  // Adjusting state while rendering (not in an effect) so the first paint after auth settles
  // already shows the right items. It converges: the next render sees picked.key === key.
  if (!loading && (!picked || (picked.key !== key && !run.answered))) {
    items = selectSkillItems(type, bank, count, run.review, userId);
    runKey = key;
    setPicked({ key, items });
  }

  const markAnswered = useCallback(() => {
    setRun((current) => (current.answered ? current : { ...current, answered: true }));
  }, []);

  const restart = useCallback((review = false) => {
    setRun({ sessionId: crypto.randomUUID(), review, answered: false });
  }, []);

  return {
    userId,
    /** Null while auth is still loading. */
    items,
    /** Changes with every fresh selection; use it as a React key for per-run state. */
    runKey,
    sessionId: run.sessionId,
    reviewMode: run.review,
    markAnswered,
    restart,
  };
}
