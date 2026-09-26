import { useState, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RotateCcw, ChevronRight, type LucideIcon } from "lucide-react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import SEOHead from "../seo/SEOHead";
import UcatGuidesPanel from "../layout/UcatGuidesPanel";
import TrainerFaqSection from "../seo/TrainerFaqSection";
import SJTDomainBadge from "./SJTDomainBadge";
import SJTQuestionSkeleton from "./SJTQuestionSkeleton";
import SJTPerformancePanel from "./SJTPerformancePanel";
import { useSJTQuestionSession } from "../../hooks/useSJTQuestionSession";
import { useAuth } from "../../hooks/useAuth";
import { trainerFaqs } from "../../data/trainerFaqs";
import { recordSJTAttempt } from "../../lib/sjtAnalytics";
import { persistSJTSession } from "../../lib/sjtSessionStorage";
import { recordSJTPartialAttempt, resolveSJTResume, settleAbandonedSJTScenario, supersedeSJTPartialAttempt, writeOwnedActiveSJTScenario } from "../../lib/sjtActiveScenario";
import { getSiteBaseUrl } from "../../lib/siteUrl";
import { cn } from "../../lib/cn";
import type { SJTQuestion, SJTQuestionType, SJTQuizProgress } from "../../types/sjt";

import { GMC_DOMAINS_LIST } from "../../data/gmcDomains";
import { loadSJTReviews, saveSJTReview, removeSJTReview } from "../../lib/sjtReview";
import { UCAT_TUTORING_URL } from "../../lib/productUpsell";
import { trackEvent } from "../../lib/analytics";
import SJTNextDrill from "./SJTNextDrill";
import { syncSJTReviewOutcome, syncSJTReviewRemoval } from "../../lib/sjtReviewCloud";
import {
  activeSJTScenarioOwnership,
  clearSJTAnswerDraft,
  claimActiveSJTScenario,
  claimSJTAttemptCompletion,
  heartbeatSJTScenario,
  isActiveSJTScenarioKey,
  markSJTAttemptSaved,
  newSJTAttemptId,
  releaseSJTScenario,
  SJT_ACTIVE_HEARTBEAT_MS,
  sjtDraftScope,
  sjtTabId,
  type ActiveSJTScenario,
  type SJTAttemptSavedMarker,
} from "../../lib/sjtDraftRecovery";

type Phase = "intro" | "quiz" | "between";

/**
 * The scenario attempt this tab is showing. "owned": this tab owns its
 * active-scenario pointer; "lost": another tab took the pointer over (this tab
 * takes it back once that tab releases it or goes quiet) or it was already
 * claimed and recorded; "pointerless": no pointer (review mode, storage
 * unavailable, or another tab holds this trainer's pointer), so it is recorded
 * directly.
 */
type TabAttempt = { questionId: string; attemptId: string; state: "owned" | "lost" | "pointerless" };

export type SJTQuizHandlers = {
  /** Leave the scenario for the summary screen. Records the attempt if onSubmitted has not. */
  onComplete: (score: number, max: number) => void;
  /** The answer is final and marked: record the completed attempt now. Idempotent. */
  onSubmitted: (score: number, max: number) => void;
  onProgress: (progress: SJTQuizProgress) => void;
  /** Draft recovery scope (user id or "guest"); null disables drafts, e.g. in delayed-review mode. */
  draftScope: string | null;
};

type Props = {
  type: SJTQuestionType;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  /** Short label for the final breadcrumb crumb (e.g. "Appropriateness"). */
  breadcrumbLabel: string;
  faqId: string;
  emptyMessage: string;
  introContent: ReactNode;
  renderQuiz: (question: SJTQuestion, handlers: SJTQuizHandlers) => ReactNode;
};

export default function SJTTrainerSessionPage(props: Props) {
  const [params] = useSearchParams();
  const { user } = useAuth();
  // Read by the outgoing session when the account changes, so it hands its scenario over instead of recording it.
  // Layout effects run before the unmounted session's passive cleanup, so it sees the new account.
  const authScopeRef = useRef(sjtDraftScope(user?.id));
  const authScope = sjtDraftScope(user?.id);
  useLayoutEffect(() => { authScopeRef.current = authScope; }, [authScope]);
  return <SJTTrainerSession key={`${props.type}:${params.get("review") ?? "practice"}:${user?.id ?? "guest"}`} authScopeRef={authScopeRef} {...props} />;
}

function SJTTrainerSession({
  type,
  icon: Icon,
  title,
  subtitle,
  seoTitle,
  seoDescription,
  canonicalPath,
  breadcrumbLabel,
  faqId,
  emptyMessage,
  introContent,
  renderQuiz,
  authScopeRef,
}: Props & { authScopeRef: { readonly current: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const topic = GMC_DOMAINS_LIST.some(d => d.id === params.get("topic")) ? params.get("topic")! : "";
  const difficulty = ["easy", "medium", "hard"].includes(params.get("difficulty") ?? "") ? params.get("difficulty")! : "";
  const reviewId = params.get("review") ?? "";
  const [review] = useState(() => loadSJTReviews(user?.id).find(r => r.type === type && r.id === reviewId && r.due <= Date.now()));
  const [reviewSaved, setReviewSaved] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");
  // Delayed retries must be answered from memory, so they never save or restore drafts.
  const draftScope = reviewId ? null : sjtDraftScope(user?.id);
  // Half-finished scenario to reopen after a reload: undefined until auth has settled.
  const [resume, setResume] = useState<ActiveSJTScenario | null | undefined>(undefined);
  useEffect(() => {
    if (authLoading || resume !== undefined) return;
    // Settling a stale pointer (expired, other filters) records its partial attempt once.
    setResume(resolveSJTResume(draftScope, type, { domain: topic, difficulty }));
  }, [authLoading, resume, draftScope, type, topic, difficulty]);
  const {
    question,
    loading,
    error,
    resumeStatus,
    advanceToNext,
    resetSession,
    retry,
  } = useSJTQuestionSession(type, !authLoading && resume !== undefined && (!reviewId || !!review), {
    domain: reviewId ? undefined : topic, difficulty: reviewId ? undefined : difficulty,
    questionId: reviewId || undefined,
  }, resume?.questionId ?? null);

  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMax, setSessionMax] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [lastScore, setLastScore] = useState<{ score: number; max: number } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);
  const [savedElsewhere, setSavedElsewhere] = useState(false);

  const progressRef = useRef<SJTQuizProgress | null>(null);
  const savedQuestionIdRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  const questionRef = useRef(question);
  const userIdRef = useRef(user?.id ?? null);
  const draftScopeRef = useRef(draftScope);
  const filtersRef = useRef({ domain: topic, difficulty });
  const attemptRef = useRef<TabAttempt | null>(null);
  /** Question id whose attempt another tab has taken over or recorded (this tab then shows a notice and stops saving drafts). */
  const [lostQuestionId, setLostQuestionId] = useState<string | null>(null);

  phaseRef.current = phase;
  questionRef.current = question;
  userIdRef.current = user?.id ?? null;
  draftScopeRef.current = draftScope;
  filtersRef.current = { domain: topic, difficulty };

  const base = getSiteBaseUrl();
  const canonical = base ? `${base}${canonicalPath}` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt = `UCAT SJT ${title} trainer interface showing a scenario and rating options`;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Situational Judgement", url: `${base}/ucat-sjt-practice` },
        { name: breadcrumbLabel, url: `${base}${canonicalPath}` },
      ]
    : undefined;
  const sessionPct =
    sessionMax > 0
      ? Math.min(100, Math.round((sessionScore / sessionMax) * 100))
      : null;

  useEffect(() => {
    savedQuestionIdRef.current = null;
    progressRef.current = null;
  }, [question?.id]);

  const markLost = useCallback((attempt: TabAttempt) => {
    attempt.state = "lost";
    setLostQuestionId(attempt.questionId);
  }, []);

  /**
   * Keep the active-scenario pointer current so a reload can reopen this scenario.
   * A tab that lost the attempt to another tab takes it back here once that tab
   * has released it or stopped heartbeating.
   */
  const writeActivePointer = useCallback(() => {
    const q = questionRef.current;
    const scope = draftScopeRef.current;
    if (!q || phaseRef.current !== "quiz" || savedQuestionIdRef.current === q.id) return;
    let attempt = attemptRef.current;
    if (!attempt || attempt.questionId !== q.id) {
      attempt = { questionId: q.id, attemptId: newSJTAttemptId(), state: "pointerless" };
      attemptRef.current = attempt;
    }
    if (!scope) return;
    const wasLost = attempt.state === "lost";
    const result = writeOwnedActiveSJTScenario(scope, {
      type: q.type, questionId: q.id, domain: q.domain, filters: filtersRef.current, progress: progressRef.current, attemptId: attempt.attemptId,
    }, attempt.state !== "pointerless");
    if (result === "owned") {
      attempt.state = "owned";
      if (wasLost) setLostQuestionId(null);
    } else if (result === "lost") markLost(attempt);
    else attempt.state = "pointerless";
  }, [markLost]);

  /** Re-checks (and refreshes) ownership of the attempt this tab shows; used by the heartbeat and cross-tab events. */
  const checkOwnership = useCallback((heartbeat: boolean) => {
    const attempt = attemptRef.current;
    const q = questionRef.current;
    const scope = draftScopeRef.current;
    if (!attempt || attempt.state === "pointerless" || !q || attempt.questionId !== q.id || !scope || phaseRef.current !== "quiz") return;
    if (attempt.state === "owned") {
      const ownership = heartbeat
        ? heartbeatSJTScenario(scope, q.type, attempt.attemptId, sjtTabId())
        : activeSJTScenarioOwnership(scope, q.type, attempt.attemptId, sjtTabId());
      if (ownership === "owner") return;
      markLost(attempt);
    }
    // Lost: take it back if the other tab has released it or gone quiet (a no-op while it is live, or once it is recorded).
    writeActivePointer();
  }, [markLost, writeActivePointer]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const onStorage = (event: StorageEvent) => { if (isActiveSJTScenarioKey(event.key)) checkOwnership(false); };
    const onVisible = () => { if (document.visibilityState === "visible") checkOwnership(true); };
    // Restored from the back/forward cache after pagehide released the pointer: mark it live again.
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) checkOwnership(true); };
    const timer = window.setInterval(() => checkOwnership(true), SJT_ACTIVE_HEARTBEAT_MS);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [phase, checkOwnership]);

  useEffect(() => {
    if (phase !== "quiz" || !question) return;
    writeActivePointer();
  }, [phase, question, writeActivePointer]);

  // The resumed scenario no longer exists (removed or hidden, or the targeted RPC is missing):
  // it is discarded, recording its partial attempt, and a new scenario is served instead.
  // A network error while resuming is not "failed": the pointer and draft are kept for Try again.
  useEffect(() => {
    if (resumeStatus === "failed" && resume) settleAbandonedSJTScenario(draftScope, type, resume.questionId, resume.attemptId);
  }, [resumeStatus, resume, draftScope, type]);

  // Reopen a resumed scenario straight into the quiz, at the first unmarked item.
  const resumedQuestionId = resumeStatus === "resumed" ? resume?.questionId ?? null : null;
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || !resumedQuestionId || !resume || question?.id !== resumedQuestionId) return;
    autoStartedRef.current = true;
    // resolveSJTResume made this tab the owner of the resumed attempt.
    attemptRef.current = { questionId: resume.questionId, attemptId: resume.attemptId, state: "owned" };
    setPhase("quiz");
  }, [resumedQuestionId, resume, question?.id]);

  useEffect(() => {
    if (phase === "between") {
      document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
    } else if (phase === "quiz") {
      document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [phase]);

  /**
   * Record a partial attempt when a scenario is left before it was submitted.
   * "leave" is an in-app exit (reset, starting another scenario) and "unmount"
   * a navigation away: the pointer is claimed and the partial recorded now.
   * "pagehide" may be a reload: the owner only releases its pointer and records
   * nothing; the partial is recorded later, once, if the scenario is discarded
   * instead of resumed (next trainer visit, or the hub or Dashboard). An unmount
   * caused by signing in or out also only releases it (sign-in then moves it to
   * the account). A tab that has lost the attempt to another tab never records.
   * Without a pointer the partial is recorded immediately.
   */
  const flushPartialIfNeeded = useCallback((reason: "leave" | "unmount" | "pagehide") => {
    const q = questionRef.current;
    if (phaseRef.current !== "quiz" || !q) return;
    // Already submitted and recorded as complete (or already recorded as partial).
    if (savedQuestionIdRef.current === q.id) return;

    const scope = draftScopeRef.current;
    const attempt = attemptRef.current?.questionId === q.id ? attemptRef.current : null;
    const accountChanged = reason === "unmount" && authScopeRef.current !== sjtDraftScope(userIdRef.current);

    if (scope && attempt && attempt.state !== "pointerless") {
      if (attempt.state === "lost") return;
      const tabId = sjtTabId();
      if (activeSJTScenarioOwnership(scope, q.type, attempt.attemptId, tabId) !== "owner") {
        attempt.state = "lost";
        return;
      }
      if (reason === "pagehide" || accountChanged) {
        releaseSJTScenario(scope, q.type, attempt.attemptId, tabId);
        return;
      }
      // Claim first: if another tab or a settle already took it, it is not recorded twice.
      const claimed = claimActiveSJTScenario(scope, q.type, q.id, attempt.attemptId);
      attemptRef.current = null;
      const progress = progressRef.current ?? claimed?.progress ?? null;
      if (!claimed || !progress || progress.itemsAttempted <= 0) return;
      savedQuestionIdRef.current = q.id;
      const localId = recordSJTPartialAttempt(userIdRef.current, { questionId: q.id, type: q.type, domain: q.domain }, progress);
      // A tab that lost this attempt and finishes it later then replaces this partial instead of being told it was saved.
      markSJTAttemptSaved(scope, attempt.attemptId, "partial", { localId });
      return;
    }

    clearSJTAnswerDraft(scope, q.type, q.id);
    if (attempt) attemptRef.current = null;
    const progress = progressRef.current;
    if (!progress || progress.itemsAttempted <= 0) return;
    savedQuestionIdRef.current = q.id;
    recordSJTPartialAttempt(userIdRef.current, { questionId: q.id, type: q.type, domain: q.domain }, progress);
  }, [authScopeRef]);

  useEffect(() => {
    return () => {
      flushPartialIfNeeded("unmount");
    };
  }, [flushPartialIfNeeded]);

  useEffect(() => {
    const onPageHide = () => flushPartialIfNeeded("pagehide");
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushPartialIfNeeded]);

  const handleProgress = useCallback((progress: SJTQuizProgress) => {
    progressRef.current = progress;
    writeActivePointer();
  }, [writeActivePointer]);

  const handleSubmitted = useCallback(
    (score: number, max: number) => {
      if (!question || savedQuestionIdRef.current === question.id) return;
      const attempt = attemptRef.current?.questionId === question.id ? attemptRef.current : null;
      attemptRef.current = null;
      savedQuestionIdRef.current = question.id;
      // Claim the pointer before recording, so the scenario can never also be recorded as partial.
      // If the pointer is already gone, the attempt's saved marker decides: completed in another tab
      // means show the result here without a second row; a partial saved meanwhile (another tab left
      // it, or a settle recorded it) is superseded by this completed attempt.
      let recordHere = true;
      let supersedes: SJTAttemptSavedMarker | null = null;
      if (draftScope && attempt && attempt.state !== "pointerless") {
        ({ record: recordHere, supersedes } = claimSJTAttemptCompletion(draftScope, question.type, question.id, attempt.attemptId));
      } else if (draftScope && !attempt) {
        claimActiveSJTScenario(draftScope, question.type, question.id);
      }
      clearSJTAnswerDraft(draftScope, question.type, question.id);
      setSessionScore((s) => s + score);
      setSessionMax((m) => m + max);
      setQuestionsAttempted((n) => n + 1);
      setLastScore({ score, max });
      if (!recordHere) {
        setSavedElsewhere(true);
        return;
      }
      setSavedElsewhere(false);
      if (supersedes) supersedeSJTPartialAttempt(user?.id ?? null, { questionId: question.id, type: question.type }, supersedes);
      const hadReviewEntry = Boolean(review) || loadSJTReviews(user?.id).some((entry) => entry.id === question.id && entry.type === question.type);
      const savedLocally = saveSJTReview(user?.id ?? null, question, score, max);
      setReviewSaved(savedLocally);
      if (user?.id && savedLocally) void syncSJTReviewOutcome(user.id, question, hadReviewEntry);
      recordSJTAttempt({
        questionId: question.id,
        domain: question.domain,
        type: question.type,
        score,
        maxScore: max,
      });
      void persistSJTSession(user?.id ?? null, {
        question_id: question.id,
        question_type: question.type,
        domain: question.domain,
        score,
        max_score: max,
        items_attempted: max,
        items_total: max,
        completed: true,
      });
      setPerformanceRefreshKey((key) => key + 1);
    },
    [question, user?.id, review, draftScope],
  );

  const handleComplete = useCallback(
    (score: number, max: number) => {
      handleSubmitted(score, max);
      setPhase("between");
    },
    [handleSubmitted],
  );

  const handleNext = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceToNext();
      savedQuestionIdRef.current = null;
      progressRef.current = null;
      setPhase("quiz");
    } finally {
      setAdvancing(false);
    }
  }, [advanceToNext]);

  /** Discard a resumed scenario (recording its partial attempt) and serve a new one. */
  const handleStartNew = useCallback(async () => {
    flushPartialIfNeeded("leave");
    setAdvancing(true);
    try {
      await advanceToNext();
      savedQuestionIdRef.current = null;
      progressRef.current = null;
    } finally {
      setAdvancing(false);
    }
  }, [advanceToNext, flushPartialIfNeeded]);

  const handleReset = useCallback(() => {
    flushPartialIfNeeded("leave");
    setSessionScore(0);
    setSessionMax(0);
    setQuestionsAttempted(0);
    setLastScore(null);
    savedQuestionIdRef.current = null;
    progressRef.current = null;
    setPhase("intro");
    resetSession();
  }, [resetSession, flushPartialIfNeeded]);

  const showIntroSkeleton = phase === "intro" && (authLoading || loading) && !question && (!reviewId || !!review);
  const noQuestions = !authLoading && !loading && !question && !error;

  const lostToOtherTab = !!question && lostQuestionId === question.id;
  const quizHandlers: SJTQuizHandlers = {
    onComplete: handleComplete,
    onSubmitted: handleSubmitted,
    onProgress: handleProgress,
    // Once another tab has this scenario, drafts here would overwrite that tab's.
    draftScope: lostToOtherTab ? null : draftScope,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonical}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <main className="flex-1 py-5 sm:py-6 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {question && phase !== "between" && (
                <SJTDomainBadge domain={question.domain} showLink />
              )}
              {questionsAttempted > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{questionsAttempted} done</p>
                  {sessionPct != null && (
                    <p className="text-sm font-bold text-foreground">{sessionPct}%</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive-muted p-4 text-sm text-foreground">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {phase === "intro" && (
            <div className="space-y-5">
              {introContent}
              {reviewId ? <div className="rounded-xl border border-border p-4 text-sm">
                {review ? "Delayed retry: answer from memory before checking the explanations." : "This review is not due or is no longer in your queue."}
                <Link to="/ucat-sjt-practice" className="block text-primary underline mt-2">View my review queue</Link>
              </div> : <fieldset className="grid sm:grid-cols-2 gap-4 rounded-xl border border-border p-4">
                <legend className="px-2 font-semibold text-sm">Target your practice</legend>
                <label className="text-sm font-medium">Topic (GMC domain)
                  <select value={topic} onChange={e => { const next = new URLSearchParams(params); next.set("topic", e.target.value); setParams(next, { replace: true }); }} className="block w-full mt-2 min-h-[44px] rounded-lg border border-border bg-card px-3">
                    <option value="">All topics</option>
                    {GMC_DOMAINS_LIST.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Difficulty
                  <select value={difficulty} onChange={e => { const next = new URLSearchParams(params); next.set("difficulty", e.target.value); setParams(next, { replace: true }); }} className="block w-full mt-2 min-h-[44px] rounded-lg border border-border bg-card px-3">
                    <option value="">All difficulties</option><option value="easy">Foundation</option><option value="medium">Standard</option><option value="hard">Challenging</option>
                  </select>
                </label>
              </fieldset>}
              {showIntroSkeleton && <SJTQuestionSkeleton />}
              {noQuestions && !error && (
                <p className="text-sm text-muted-foreground text-center">{reviewId ? "This scenario is no longer available for review." : topic || difficulty ? "No published scenarios match these filters. Try another topic or difficulty." : emptyMessage}</p>
              )}
              {question && !showIntroSkeleton && (
                <button
                  type="button"
                  onClick={() => setPhase("quiz")}
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Start practising
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              )}
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-muted-foreground hover:text-primary">
                  Back to SJT hub
                </Link>
              </p>
            </div>
          )}

          {noQuestions && reviewId && <button type="button" className="min-h-[44px] text-sm text-primary underline" onClick={() => {
            if (removeSJTReview(user?.id ?? null, reviewId, type)) {
              if (user?.id) void syncSJTReviewRemoval(user.id, reviewId, type, review?.domain);
              setParams({});
            } else setReviewSaved(false);
          }}>Remove unavailable scenario from my review queue</button>}
          {phase === "quiz" && noQuestions && <p role="status" className="text-sm text-muted-foreground">No scenarios are available with these filters. <button type="button" onClick={handleReset} className="underline text-primary min-h-[44px]">Change practice settings</button></p>}
          {phase === "quiz" && !loading && question && question.id === resumedQuestionId && (
            <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground">
              <span>Picked up where you left off.</span>
              <button type="button" onClick={() => void handleStartNew()} disabled={advancing} className="min-h-[44px] text-sm text-primary underline disabled:opacity-50">
                Start a new scenario instead
              </button>
            </div>
          )}
          {phase === "quiz" && !loading && lostToOtherTab && (
            <p role="status" className="mb-4 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground">
              This scenario is also open in another tab. It is saved once, from whichever tab finishes it first.
            </p>
          )}
          {phase === "quiz" && loading && <SJTQuestionSkeleton />}
          {phase === "quiz" && !loading && question && renderQuiz(question, quizHandlers)}

          {phase === "between" && (
            <div className="space-y-5 max-w-xl mx-auto">
              {lastScore && (
                <div
                  className={cn(
                    "rounded-xl border p-5 text-center",
                    lastScore.score === lastScore.max
                      ? "bg-training-success-muted border-training-success"
                      : lastScore.score >= lastScore.max * 0.6
                        ? "bg-warning-muted border-warning"
                        : "bg-destructive-muted border-destructive",
                  )}
                >
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {lastScore.score} / {lastScore.max}
                  </p>
                  <p className="text-sm text-muted-foreground">on this scenario</p>
                  {sessionPct != null && questionsAttempted > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Session total: {sessionScore} / {sessionMax} ({sessionPct}%) across{" "}
                      {questionsAttempted} scenarios
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center px-2">
                Completed scenarios sync to your dashboard when you are signed in. If you leave
                mid-scenario, partial progress is saved too.
              </p>
              {savedElsewhere && <p role="status" className="text-sm text-muted-foreground">This scenario was already completed in another tab, so this result was not saved again.</p>}
              {!reviewSaved && <p role="status" className="text-sm text-destructive">Your browser could not save this mistake review. Check that browser storage is available.</p>}
              {!savedElsewhere && reviewSaved && lastScore && lastScore.score < lastScore.max && <p role="status" className="text-sm text-muted-foreground">Added to your mistake reviews. Your next retry is in 24 hours.</p>}
              <SJTNextDrill onStart={handleReset} />
              {lastScore && lastScore.score < lastScore.max && <aside className="rounded-xl border border-border p-4 space-y-2">
                <h2 className="font-semibold text-sm">Want help with your SJT reasoning?</h2>
                <p className="text-sm text-muted-foreground">If the distinction between these answers is still unclear after the explanations, a tutor can work through your reasoning with you.</p>
                <a
                  href={UCAT_TUTORING_URL + "?utm_source=trainer&utm_medium=feedback&utm_campaign=sjt"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void trackEvent("upsell_click", { offer: "tutoring", placement: "post_drill", skill: `sjt_${type}` })}
                  className="inline-flex items-center min-h-[44px] text-sm text-primary underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                >
                  Explore SJT tutoring (opens in a new tab)
                </a>
              </aside>}
              {advancing && <SJTQuestionSkeleton />}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => { if (reviewId) setParams({}); else void handleNext(); }}
                  disabled={advancing}
                  className="flex-1 min-h-[44px] rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reviewId ? "Return to practice" : "Next scenario"}
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 min-h-[44px] rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Reset session
                </button>
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Domain performance
                </p>
                <SJTPerformancePanel
                  refreshKey={performanceRefreshKey}
                  onClear={() => setPerformanceRefreshKey((key) => key + 1)}
                />
              </div>
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-muted-foreground hover:text-primary">
                  Back to SJT hub
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
      <UcatGuidesPanel embedded context="sjtHub" />
      <TrainerFaqSection
        embedded
        id={faqId}
        title="Common questions about the UCAT SJT"
        intro="Frequently asked questions about the Situational Judgement Test: how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
        faqs={trainerFaqs.sjtHub}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
