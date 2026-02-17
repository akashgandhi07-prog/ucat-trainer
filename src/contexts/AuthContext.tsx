import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { authLog } from "../lib/logger";
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

  const fetchProfile = useCallback(async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
  }, []);

  const loadSession = useCallback(async () => {
    setSessionLoadFailed(false);
    setLoading(true);
    try {
      const { data: { session }, error } = await withRetry(
        () => supabase.auth.getSession(),
        { retries: GET_SESSION_RETRIES, baseMs: GET_SESSION_BASE_MS }
      );
      if (error) {
        authLog.error("getSession failed", error);
        setUser(null);
        setProfile(null);
        setSessionLoadFailed(true);
        authLog.info("Session load failed flag set", { scope: "loadSession", reason: "getSession error" });
        return;
      }
      const u = session?.user ?? null;
      authLog.info("Session resolved", {
        hasUser: !!u,
        userId: u?.id,
        email: u?.email,
      });
      setUser(u);
      if (u) {
        let p = await getProfile(u.id);
        if (!p) {
          authLog.info("No profile row for user, creating minimal profile", { userId: u.id });
          await upsertProfile(u.id, null, null);
          p = await getProfile(u.id);
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch (err) {
      authLog.error("getSession failed after retries", err);
      setUser(null);
      setProfile(null);
      setSessionLoadFailed(true);
      authLog.info("Session load failed flag set", { scope: "loadSession", reason: "retry exhaustion" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();

    let mounted = true;
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

      if (event === "SIGNED_IN" && session?.user) {
        const guestSessions = getGuestSessions();
        if (guestSessions.length > 0 && mounted) {
          const rows = guestSessions.map((g) => ({
            user_id: session.user.id,
            training_type: g.training_type,
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
            showToast("History successfully synced!");
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
        await fetchProfile(session.user.id);
      } else if (u) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }

      if (mounted) {
        if (!u && user) {
          authLog.info("Auth context user cleared", {
            prevUserId: user.id,
            event,
          });
        }
        setUser(u);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const refetchProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const retryGetSession = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
