import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { loadSJTReviews, loadSJTReviewStats, removeSJTReview, resetSJTReviewState, sjtPracticePath, snoozeSJTReview } from "../../lib/sjtReview";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import { fetchSJTRecommendationRows, getGuestSJTSessions, SJT_SESSIONS_UPDATED_EVENT } from "../../lib/sjtSessionStorage";
import { recommendSJTDrill, type SJTRecommendationRow } from "../../lib/sjtRecommendation";
import { settleStaleSJTScenarios } from "../../lib/sjtActiveScenario";
import { clearCloudSJTReviews, getReviewStoragePreference, setReviewStoragePreference, syncSJTReviewRemoval, syncSJTReviewState, type ReviewStoragePreference } from "../../lib/sjtReviewCloud";

/**
 * Pass `sessions` when the caller already has the student's SJT attempts (for
 * example the Dashboard). Otherwise signed-in students' completed attempts are
 * fetched here, and guests use their browser history.
 */
export default function SJTNextDrill({ onStart, sessions }: { onStart?: () => void; sessions?: SJTRecommendationRow[] }) {
  const { user, loading } = useAuth();
  const [now, refresh] = useState(() => Date.now());
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced" | "offline">("idle");
  const [preferenceChoice, setPreferenceChoice] = useState<{ userId: string; value: ReviewStoragePreference } | null>(null);
  const [cloudSessions, setCloudSessions] = useState<{ userId: string; rows: SJTRecommendationRow[] } | null>(null);
  const [sessionsVersion, setSessionsVersion] = useState(0);
  // Hub and Dashboard load: record scenarios abandoned mid-way (tab closed, expired) that no open tab is showing.
  useEffect(() => {
    if (loading) return;
    settleStaleSJTScenarios(user?.id ?? null);
  }, [loading, user?.id]);
  useEffect(() => {
    const bump = () => setSessionsVersion((v) => v + 1);
    window.addEventListener(SJT_SESSIONS_UPDATED_EVENT, bump);
    return () => window.removeEventListener(SJT_SESSIONS_UPDATED_EVENT, bump);
  }, []);
  useEffect(() => {
    if (sessions || !user?.id) return;
    let active = true;
    const userId = user.id;
    void fetchSJTRecommendationRows(userId).then((rows) => {
      if (active && rows) setCloudSessions({ userId, rows });
    });
    return () => { active = false; };
  }, [sessions, user?.id, sessionsVersion]);
  useEffect(() => {
    const update = () => refresh(Date.now());
    window.addEventListener("sjt-review-updated", update);
    window.addEventListener("storage", update);
    const timer = window.setInterval(update, 60_000);
    return () => { window.removeEventListener("sjt-review-updated", update); window.removeEventListener("storage", update); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!user?.id || getReviewStoragePreference(user.id) === "device") return;
    let active = true;
    void syncSJTReviewState(user.id).then((result) => {
      if (!active) return;
      setSyncStatus(result.synced ? "synced" : "offline");
      refresh(Date.now());
    });
    return () => { active = false; };
  }, [user?.id]);
  if (loading) return null;
  const entries = loadSJTReviews(user?.id).sort((a, b) => a.due - b.due);
  const { cleared } = loadSJTReviewStats(user?.id);
  const due = entries.filter(r => r.due <= now);
  const next = due[0];
  const upcoming = entries[0];
  const storagePreference: ReviewStoragePreference = !user?.id ? "account"
    : preferenceChoice?.userId === user.id ? preferenceChoice.value : getReviewStoragePreference(user.id);
  const signedInRows = user?.id && cloudSessions?.userId === user.id ? cloudSessions.rows : null;
  // Signed in: never fall back to guest browser history, which belongs to someone else or no one.
  const recommendation = recommendSJTDrill(sessions ?? (user?.id ? signedInRows ?? [] : getGuestSJTSessions()));
  const storageCopy = !user
    ? "Mistake reviews for guest practice are saved in this browser only."
    : storagePreference === "device"
      ? "Mistake reviews are saved on this device only, separately for your account."
      : syncStatus === "offline"
        ? "Mistake reviews are saved to your account. This device is keeping a copy until sync is available again."
        : "Mistake reviews are saved to your account, so they follow you across devices.";
  const path = next ? `${sjtPracticePath(next.type)}?review=${encodeURIComponent(next.id)}` :
    upcoming ? `${sjtPracticePath(upcoming.type)}?topic=${upcoming.domain}` :
      `${sjtPracticePath(recommendation.type)}${recommendation.domain ? `?topic=${recommendation.domain}` : ""}`;
  const recommendationCopy = recommendation.reason === "weakest_topic" && recommendation.domain
    ? `Practise ${GMC_DOMAINS[recommendation.domain].shortName}: it is your lowest measured SJT topic at ${recommendation.accuracy}% across ${recommendation.evidence} completed scenarios (${recommendation.confidence} evidence)${recommendation.lastPractisedAt ? `, last practised ${new Date(recommendation.lastPractisedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}.`
    : recommendation.reason === "least_practised_type"
      ? `Try ${recommendation.type}: it is your least-practised SJT question type, so this will make your progress picture more balanced.`
      : "Start with one SJT appropriateness scenario, then read the explanation for each rating.";
  return <section aria-label="Recommended next drill" className="rounded-xl border border-border bg-card p-5 space-y-3">
    <h2 className="font-semibold text-foreground">Your next drill</h2>
    <p className="text-sm text-muted-foreground">{next
      ? `Revisit ${GMC_DOMAINS[next.domain].shortName}. ${due.length} SJT scenario${due.length === 1 ? " is" : "s are"} ready for a delayed retry.`
      : upcoming ? `Practise another scenario in ${GMC_DOMAINS[upcoming.domain].shortName} while your mistake review is waiting.`
      : recommendationCopy}</p>
    <Link onClick={onStart} to={path} className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 font-semibold text-sm text-primary-foreground">{next ? "Review my mistakes" : "Start recommended drill"}</Link>
    <p className="text-xs text-muted-foreground">{storageCopy} Retry after 24 hours, then again after 3 days. Two successful delayed retries clear a scenario.</p>
    {cleared > 0 && <p className="text-sm font-medium text-emerald-700">{cleared} mistake{cleared === 1 ? "" : "s"} successfully cleared</p>}
    {user && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <label htmlFor="sjt-review-storage">Save reviews:</label>
      <select
        id="sjt-review-storage"
        value={storagePreference}
        onChange={(event) => {
          const value = event.target.value as ReviewStoragePreference;
          setReviewStoragePreference(user.id, value);
          setPreferenceChoice({ userId: user.id, value });
          setSyncStatus("idle");
          if (value === "account") void syncSJTReviewState(user.id).then((result) => { setSyncStatus(result.synced ? "synced" : "offline"); refresh(Date.now()); });
        }}
        className="min-h-[36px] rounded-md border border-border bg-background px-2 text-foreground"
      >
        <option value="account">My account</option>
        <option value="device">This device only</option>
      </select>
      {syncStatus === "synced" && <span role="status">Synced</span>}
      {syncStatus === "offline" && <span role="status">Using device copy; account sync will retry later</span>}
    </div>}
    {entries.length > 0 && <details>
      <summary className="cursor-pointer min-h-[44px] py-2 text-sm font-medium inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md">
        Review queue ({entries.length})
      </summary>
      <ul className="space-y-2 text-sm mt-2">{entries.map(r => <li key={`${r.type}:${r.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <span>{GMC_DOMAINS[r.domain].shortName} · {r.type} · {r.id}</span>
        <span className="flex flex-wrap items-center gap-3">
          {r.due <= now ? <Link onClick={onStart} className="text-primary underline min-h-[44px] inline-flex items-center" to={`${sjtPracticePath(r.type)}?review=${encodeURIComponent(r.id)}`}>Retry scenario</Link> : <span className="text-muted-foreground">Due {new Date(r.due).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>}
          <button type="button" className="min-h-[44px] underline text-muted-foreground" onClick={() => { if (snoozeSJTReview(user?.id ?? null, r.id, r.type)) { refresh(Date.now()); if (user?.id) void syncSJTReviewState(user.id); } }}>Snooze 1 day</button>
          <button type="button" className="min-h-[44px] underline text-muted-foreground" onClick={() => { if (removeSJTReview(user?.id ?? null, r.id, r.type)) { refresh(Date.now()); if (user?.id) void syncSJTReviewRemoval(user.id, r.id, r.type, r.domain); } }}>Dismiss</button>
        </span>
      </li>)}</ul>
      <button type="button" className="mt-3 min-h-[44px] text-sm text-destructive underline" onClick={() => {
        if (!window.confirm("Reset your SJT review queue and cleared-mistake count?")) return;
        if (resetSJTReviewState(user?.id ?? null)) { refresh(Date.now()); if (user?.id) void clearCloudSJTReviews(user.id); }
      }}>Reset review history</button>
    </details>}
  </section>;
}
