import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { authLog } from "../lib/logger";
import { getProfile, upsertProfile } from "../lib/profileApi";
import { getGuestSessions, clearGuestSessions } from "../lib/guestSessions";
import { useToast } from "../contexts/ToastContext";
import type { AuthState } from "../types/session";

const GET_SESSION_RETRIES = 2;
const GET_SESSION_BASE_MS = 600;

export function useAuth(): AuthState {
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
        fetchProfile(u.id).catch((e) => authLog.error("Initial profile fetch failed", e));
      } else {
        setProfile(null);
      }
    } catch (err) {
      authLog.error("getSession failed after retries", err);
      setUser(null);
      setProfile(null);
      setSessionLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

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

        const meta = session.user.user_metadata;
        const fullName =
          (meta?.full_name as string) || (meta?.name as string) || null;
        const stream =
          meta?.stream && ["Medicine", "Dentistry", "Undecided"].includes(meta.stream as string)
            ? (meta.stream as "Medicine" | "Dentistry" | "Undecided")
            : undefined;
        if (fullName || stream) {
          const { ok } = await upsertProfile(session.user.id, fullName, stream);
          if (ok) await fetchProfile(session.user.id);
        } else {
          await fetchProfile(session.user.id);
        }
      } else if (u) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }

      if (mounted) setUser(u);
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

  const isAdmin = profile?.role === "admin";

  return { user, profile, loading, isAdmin, sessionLoadFailed, refetchProfile, retryGetSession };
}
