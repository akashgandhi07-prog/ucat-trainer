import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { authLog } from "../lib/logger";
import { trackEvent } from "../lib/analytics";
import { getProfile, upsertProfile } from "../lib/profileApi";
import { getGuestSessions, clearGuestSessions } from "../lib/guestSessions";
import { mergeGuestSJTOnSignIn, migrateLocalSJTAttemptsToCloud } from "../lib/sjtSessionStorage";
import { useToast } from "../contexts/ToastContext";
import { syncSignupToMailchimp } from "../lib/mailchimpSync";
import type { AuthState } from "../types/session";
import type { User } from "@supabase/supabase-js";

const GET_SESSION_RETRIES = 2;

const MAILCHIMP_JWT_OK_PREFIX = "mailchimp_jwt_ok_";

function mailchimpJwtOkKey(userId: string): string {
  return `${MAILCHIMP_JWT_OK_PREFIX}${userId}`;
}

function metaScalarFromUser(meta: Record<string, unknown> | null | undefined, keys: string[]): string | undefined {
  if (!meta) return undefined;
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/**
 * JWT backup to Mailchimp: run once per tab after a successful POST (sessionStorage)
 * so we do not hammer the Edge Function on every navigation.
 * Supabase often delivers INITIAL_SESSION without a subsequent SIGNED_IN on full page loads
 * (e.g. returning from confirm email).
 */
async function tryMailchimpJwtBackup(sessionUser: User, caller: string): Promise<void> {
  const meta = sessionUser.user_metadata as Record<string, unknown> | null;
  const emailMarketingOptIn = meta?.email_marketing_opt_in;
  if (emailMarketingOptIn === false) return;
  const stream = metaScalarFromUser(meta, ["stream"]);
  const entryYear = metaScalarFromUser(meta, ["entry_year", "entryYear"]) ?? null;
  const firstName = metaScalarFromUser(meta, ["first_name", "firstName"]) ?? null;
  const lastName = metaScalarFromUser(meta, ["last_name", "lastName"]) ?? null;
  if (!stream || !entryYear || !sessionUser.email) return;
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(mailchimpJwtOkKey(sessionUser.id))) {
      return;
    }
  } catch {
    /* ignore quota / SSR */
  }
  const ok = await syncSignupToMailchimp(
    {
      email: sessionUser.email,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      stream,
      entryYear,
    },
    caller,
  );
  if (ok) {
    try {
      sessionStorage.setItem(mailchimpJwtOkKey(sessionUser.id), "1");
    } catch {
      /* ignore */
    }
  }
}

const GET_SESSION_BASE_MS = 600;

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false);

  // Use a ref for user so the onAuthStateChange closure always has the latest value
  const userRef = useRef(user);
  /* eslint-disable-next-line react-hooks/refs -- intentional: keep ref in sync with user for listener closure */
  userRef.current = user;

  // Skip setState after AuthProvider truly unmounts. Reset on each mount so React Strict Mode
  // (cleanup then remount) does not leave this stuck false forever in development.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const p = await getProfile(userId);
    if (!mountedRef.current) return;
    setProfile(p);
  }, []);

  /* ── loadSession ───────────────────────────────────────────────── */
  const loadSession = useCallback(async () => {
    setSessionLoadFailed(false);
    setLoading(true);

    let resolvedUser: AuthState["user"] = null;

    try {
      const { data: { session }, error } = await withRetry(
        () => supabase.auth.getSession(),
        { retries: GET_SESSION_RETRIES, baseMs: GET_SESSION_BASE_MS }
      );

      if (error) {
        authLog.error("getSession returned error", error);
        // Don't early-return - fall through to finally
      } else {
        resolvedUser = session?.user ?? null;
        authLog.info("Session resolved", {
          hasUser: !!resolvedUser,
          userId: resolvedUser?.id,
          email: resolvedUser?.email,
        });
      }
    } catch (err) {
      authLog.error("getSession failed after retries", err);

      // Fix #1: clear corrupt localStorage token so next load doesn't repeat
      // scope:"local" avoids calling the Supabase server (prevents race conditions)
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }

      const isAbortError = err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
      if (!isAbortError) {
        setSessionLoadFailed(true);
        authLog.info("Session load failed flag set", { scope: "loadSession", reason: "retry exhaustion" });
      } else {
        authLog.info("Stale session cleared after AbortError - user can log in fresh");
      }
    }

    // Always runs - fix #3 (no fragile early-return before finally)
    if (!mountedRef.current) return;
    setUser(resolvedUser);
    if (resolvedUser) {
      let p = await getProfile(resolvedUser.id);
      if (!mountedRef.current) return;
      if (!p) {
        authLog.info("No profile row for user, creating minimal profile", { userId: resolvedUser.id });
        await upsertProfile(resolvedUser.id, null, null);
        p = await getProfile(resolvedUser.id);
      }
      if (!mountedRef.current) return;
      setProfile(p);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  /* ── mount: listener only (fix #7 - no double-load) ────────── */
  useEffect(() => {
    let authListenerActive = true;
    let initialLoadDone = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      authLog.info("Auth state changed", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });

      const u = session?.user ?? null;
      setSessionLoadFailed(false);

      // INITIAL_SESSION is the first event - use it instead of manual loadSession
      if (event === "INITIAL_SESSION") {
        setUser(u);
        initialLoadDone = true;
        // Always clear auth loading here. Never gate on authListenerActive: React Strict Mode
        // can tear the listener down before this runs, which would strand the app on loading.
        setLoading(false);

        if (!u) {
          setProfile(null);
          return;
        }

        void (async () => {
          let p = await getProfile(u.id);
          if (!mountedRef.current) return;
          if (!p) {
            authLog.info("No profile row, creating minimal profile", { userId: u.id });
            await upsertProfile(u.id, null, null);
            if (!mountedRef.current) return;
            p = await getProfile(u.id);
          }
          const meta = u.user_metadata as Record<string, unknown> | null;
          const metaStream = (meta?.stream as string | undefined) ?? undefined;
          const validStreams = ["Medicine", "Dentistry", "Veterinary Medicine", "Other", "Undecided"];
          if (p && !p.stream && metaStream && validStreams.includes(metaStream)) {
            authLog.info("Backfilling stream from user_metadata", { userId: u.id, stream: metaStream });
            await upsertProfile(u.id, p.full_name ?? null, metaStream);
            if (!mountedRef.current) return;
            p = (await getProfile(u.id)) ?? p;
          }
          if (!mountedRef.current) return;
          setProfile(p);
          void tryMailchimpJwtBackup(u, "auth_initial_session");
        })();
        return;
      }

      // If INITIAL_SESSION hasn't fired yet, skip other events to avoid races
      if (!initialLoadDone) return;

      if (!authListenerActive) return;

      if (event === "SIGNED_IN" && session?.user) {
        trackEvent("sign_in");
        const guestSessions = getGuestSessions();
        if (guestSessions.length > 0 && authListenerActive) {
          const rows = guestSessions.map((g) => ({
            user_id: session.user.id,
            training_type: g.training_type,
            difficulty: g.difficulty ?? null,
            wpm: g.wpm ?? null,
            correct: g.correct,
            total: g.total,
            passage_id: g.passage_id ?? null,
            wpm_rating: g.wpm_rating ?? null,
            time_seconds: g.time_seconds ?? null,
          }));
          const { error } = await supabase.from("sessions").insert(rows);
          if (!error) {
            clearGuestSessions();
            showToast("History successfully synced!", { variant: "success" });
          } else {
            authLog.error("Guest sessions merge failed", { message: error.message, code: error.code });
            showToast("Couldn't sync your guest history. It's still saved on this device.", { variant: "error" });
          }
          authLog.info("Guest sessions merge", {
            count: guestSessions.length,
            success: !error,
          });
        }

        try {
          const sjtMerged = await mergeGuestSJTOnSignIn(session.user.id);
          await migrateLocalSJTAttemptsToCloud(session.user.id);
          if (!sjtMerged && authListenerActive) {
            authLog.warn("Guest SJT sessions merge failed");
          }
        } catch (sjtErr) {
          authLog.error("Guest SJT merge failed", sjtErr);
        }

        try {
          const { migrateGuestPlannerToCloud } = await import(
            "../planner/lib/migrate-guest-planner"
          );
          const plannerMerge = await migrateGuestPlannerToCloud(session.user.id);
          if (plannerMerge.migrated && authListenerActive) {
            showToast("Your study plan was saved to your account.", { variant: "success" });
          }
        } catch (plannerErr) {
          authLog.error("Guest planner merge failed", plannerErr);
          if (authListenerActive) {
            showToast(
              "Couldn't save your guest study plan to the cloud. It's still on this device.",
              { variant: "error" },
            );
          }
        }

        const meta = session.user.user_metadata as Record<string, unknown> | null;
        const fullName =
          (meta?.full_name as string) || (meta?.name as string) || null;
        const stream = metaScalarFromUser(meta, ["stream"]);
        const firstName = metaScalarFromUser(meta, ["first_name", "firstName"]) ?? null;
        const lastName = metaScalarFromUser(meta, ["last_name", "lastName"]) ?? null;
        const entryYear = metaScalarFromUser(meta, ["entry_year", "entryYear"]) ?? null;
        const emailMarketingOptIn =
          (meta?.email_marketing_opt_in as boolean | undefined) ?? null;

        await upsertProfile(session.user.id, fullName, stream, {
          firstName,
          lastName,
          entryYear,
          emailMarketingOptIn,
        });
        await tryMailchimpJwtBackup(session.user, "auth_context_signed_in");
        if (authListenerActive) await fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        const exitingId = userRef.current?.id;
        if (exitingId && typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.removeItem(mailchimpJwtOkKey(exitingId));
          } catch {
            /* ignore */
          }
        }
        trackEvent("sign_out");
        authLog.info("User signed out", { prevUserId: userRef.current?.id });
        if (authListenerActive) setProfile(null);
      } else if (u) {
        if (authListenerActive) await fetchProfile(u.id);
      } else {
        if (authListenerActive) setProfile(null);
      }

      if (authListenerActive) setUser(u);
    });

    return () => {
      authListenerActive = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, showToast]);

  // Fallback: if INITIAL_SESSION never fires (e.g. edge case / env), stop loading after a short delay
  const loadingRef = useRef(loading);
  /* eslint-disable-next-line react-hooks/refs -- intentional: keep ref in sync for timeout callback */
  loadingRef.current = loading;
  useEffect(() => {
    const fallbackMs = 2500;
    const t = setTimeout(() => {
      if (loadingRef.current) {
        authLog.info("Auth loading fallback: INITIAL_SESSION may not have fired, calling loadSession");
        loadSession();
      }
    }, fallbackMs);
    return () => clearTimeout(t);
  }, [loadSession]);

  const refetchProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const retryGetSession = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const signOut = useCallback(async () => {
    authLog.info("Sign out requested", { userId: userRef.current?.id });
    // Clear state immediately for instant UI feedback
    setUser(null);
    setProfile(null);
    setSessionLoadFailed(false);
    // Then tell Supabase (also triggers onAuthStateChange SIGNED_OUT)
    try {
      await supabase.auth.signOut();
    } catch (err) {
      authLog.error("signOut failed", err);
      // State is already cleared so user sees logged-out UI regardless
    }
  }, []);

  const isAdmin = profile?.role === "admin";

  const value: AuthState = {
    user,
    profile,
    loading,
    isAdmin,
    sessionLoadFailed,
    refetchProfile,
    retryGetSession,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* eslint-disable react-refresh/only-export-components -- context exports Provider and hook */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
