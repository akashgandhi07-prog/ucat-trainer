import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { authLog } from "../lib/logger";
import { trackEvent } from "../lib/analytics";
import { getProfile, upsertProfile } from "../lib/profileApi";
import { getGuestSessions, clearGuestSessions } from "../lib/guestSessions";
import { useToast } from "../contexts/ToastContext";
import type { AuthState } from "../types/session";

const GET_SESSION_RETRIES = 2;
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

  // Skip setState after unmount (e.g. when fetchProfile is called from auth listener and user navigates away)
  const mountedRef = useRef(true);
  useEffect(() => {
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
    let mounted = true;
    let initialLoadDone = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      authLog.info("Auth state changed", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });

      if (!mounted) return;
      const u = session?.user ?? null;
      setSessionLoadFailed(false);

      // INITIAL_SESSION is the first event - use it instead of manual loadSession
      if (event === "INITIAL_SESSION") {
        setUser(u);
        if (u) {
          let p = await getProfile(u.id);
          if (!p) {
            authLog.info("No profile row, creating minimal profile", { userId: u.id });
            await upsertProfile(u.id, null, null);
            p = await getProfile(u.id);
          }
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
        initialLoadDone = true;
        if (mounted) setLoading(false);
        return;
      }

      // If INITIAL_SESSION hasn't fired yet, skip other events to avoid races
      if (!initialLoadDone) return;

      if (event === "SIGNED_IN" && session?.user) {
        trackEvent("sign_in");
        const guestSessions = getGuestSessions();
        if (guestSessions.length > 0 && mounted) {
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

        const meta = session.user.user_metadata as Record<string, unknown> | null;
        const fullName =
          (meta?.full_name as string) || (meta?.name as string) || null;
        const stream = (meta?.stream as string | undefined) ?? undefined;
        const firstName = (meta?.first_name as string | undefined) ?? null;
        const lastName = (meta?.last_name as string | undefined) ?? null;
        const entryYear = (meta?.entry_year as string | undefined) ?? null;
        const emailMarketingOptIn =
          (meta?.email_marketing_opt_in as boolean | undefined) ?? null;

        await upsertProfile(session.user.id, fullName, stream, {
          firstName,
          lastName,
          entryYear,
          emailMarketingOptIn,
        });
        if (mounted) await fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        trackEvent("sign_out");
        authLog.info("User signed out", { prevUserId: userRef.current?.id });
        if (mounted) setProfile(null);
      } else if (u) {
        if (mounted) await fetchProfile(u.id);
      } else {
        if (mounted) setProfile(null);
      }

      if (mounted) setUser(u);
    });

    return () => {
      mounted = false;
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
