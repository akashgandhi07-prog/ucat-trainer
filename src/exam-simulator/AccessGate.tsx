import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { decideAccess, gateRequired } from "./gateRules";
import type { GateMode, GateProfile, GateStatus } from "./gateRules";
import "./AccessGate.css";

const REQUIRED = gateRequired(import.meta.env as Record<string, unknown>);

// The main app has no /login route: sign-in is a modal opened from its header.
// The session is stored in localStorage on the same origin, so once the user
// signs in there this page picks it up when they come back to the tab.
const MAIN_APP_URL = "/";

/**
 * Wraps a local-only entry (mock exam or question database). Open by default;
 * enforced only when VITE_EXAM_SIMULATOR_REQUIRE_AUTH=true. This is a UX gate,
 * not a security boundary: anything bundled with the page is still readable.
 */
export function AccessGate({
  mode,
  appName,
  children,
}: {
  mode: GateMode;
  appName: string;
  children: ReactNode;
}) {
  if (!REQUIRED) return <>{children}</>;
  return (
    <EnforcedGate mode={mode} appName={appName}>
      {children}
    </EnforcedGate>
  );
}

function EnforcedGate({
  mode,
  appName,
  children,
}: {
  mode: GateMode;
  appName: string;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<GateStatus>("loading");
  const statusRef = useRef<GateStatus>("loading");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const resolve = useCallback(
    async (userId: string | null) => {
      if (!userId || mode === "signed-in") {
        setStatus(decideAccess(mode, userId, null));
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role, planner_role")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        setStatus("error");
        return;
      }
      setStatus(decideAccess(mode, userId, data as GateProfile));
    },
    [mode],
  );

  const recheck = useCallback(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => resolve(data.session?.user.id ?? null))
      .catch(() => setStatus("error"));
  }, [resolve]);

  useEffect(() => {
    recheck();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      // Defer the profile query: Supabase warns against awaiting client calls
      // inside this callback.
      window.setTimeout(() => void resolve(session?.user.id ?? null), 0);
    });
    // Signing in happens in the main app tab; re-read the shared session
    // when the student returns here.
    // Sign-out is still caught by onAuthStateChange once allowed.
    const onReturn = () => {
      if (statusRef.current !== "allowed") recheck();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onReturn();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onReturn);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onReturn);
    };
  }, [recheck, resolve]);

  if (status === "allowed") return <>{children}</>;

  return (
    <main className="access-gate" aria-busy={status === "loading"}>
      <div className="access-gate-card" role="status">
        <p className="access-gate-eyebrow">TheUKCATPeople</p>
        <h1>{appName}</h1>
        {status === "loading" && (
          <>
            <span className="access-gate-spinner" aria-hidden="true" />
            <p>Checking your account…</p>
          </>
        )}
        {status === "signed-out" && (
          <>
            <p>
              {mode === "staff"
                ? "Sign in with a tutor or admin account to open this workspace."
                : "Sign in to your free TheUKCATPeople account to sit the mock exam. Your progress saves to your account."}
            </p>
            <a
              className="access-gate-button"
              href={MAIN_APP_URL}
              target="_blank"
              rel="noopener"
            >
              Sign in on TheUKCATPeople
            </a>
            <p className="access-gate-hint">
              The sign-in page opens in a new tab. When you have signed in, come
              back to this tab and it will open automatically.
            </p>
            <button className="access-gate-link" onClick={recheck}>
              I have signed in
            </button>
          </>
        )}
        {status === "forbidden" && (
          <>
            <p>
              This workspace is only available to tutor and admin accounts. If
              you think you should have access, contact the TheUKCATPeople team.
            </p>
            <a className="access-gate-button" href={MAIN_APP_URL}>
              Back to TheUKCATPeople
            </a>
          </>
        )}
        {status === "error" && (
          <>
            <p>
              We could not check your account. Check your connection and try
              again.
            </p>
            <button className="access-gate-button" onClick={recheck}>
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}
