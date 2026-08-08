import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { getAuthUrlSnapshot } from "../lib/authUrlSnapshot";
import { authLog } from "../lib/logger";
import { validatePassword, getPasswordRequirementHint } from "../lib/passwordValidation";
import { useToast } from "../contexts/ToastContext";
import SEOHead from "../components/seo/SEOHead";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "no_session">("idle");
  const [message, setMessage] = useState("");
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setHasSession(!!session);
      if (!session) {
        setStatus("no_session");
        // Supabase puts the reason in the fragment when it rejects a link (expired,
        // already used); saying which one it was beats a generic prompt.
        const linkError = getAuthUrlSnapshot().errorDescription;
        setMessage(
          linkError
            ? `${linkError}. Request a new reset link and open it within 1 hour.`
            : "Use the link from your reset email to set a new password. Links expire in 1 hour.",
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setMessage("Please enter a new password.");
      setStatus("error");
      return;
    }
    const result = validatePassword(password);
    if (!result.valid) {
      setMessage(result.message);
      setStatus("error");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      authLog.error("Password update failed", { message: error.message });
      setStatus("error");
      setMessage(error.message?.includes("length") ? "Password does not meet requirements. " + getPasswordRequirementHint() : "Could not update password. Please try again.");
      return;
    }

    // Deliberately no auto-redirect. A timed bounce to the home page reads as "nothing
    // happened" on a phone - the toast is gone before it is noticed, and the landing page
    // gives no sign the password changed or that the user is already signed in. Confirm
    // in place and let them choose to move on.
    authLog.info("Password updated successfully");
    setStatus("success");
    showToast("Password updated. You are signed in.", { variant: "success" });
  };

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <>
      <SEOHead
        title="Set new password"
        description="Set a new password for your UCAT Trainer account."
        noindex
      />
      <div className="min-h-screen flex flex-col bg-secondary">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-border p-6 sm:p-8">
            <h1 className="text-xl font-semibold text-foreground mb-1">Set new password</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Choose a strong password. You’ll use it to sign in from now on.
            </p>

            {hasSession === false && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {message}
                <p className="mt-3">
                  <a href="/" className="text-primary hover:underline font-medium">
                    Return to home
                  </a>{" "}
                  or request a new reset link from the sign-in screen.
                </p>
              </div>
            )}

            {hasSession === true && status !== "success" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-foreground mb-1">
                    New password *
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className={inputClass}
                    autoComplete="new-password"
                    disabled={status === "loading"}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{getPasswordRequirementHint()}</p>
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="block text-sm font-medium text-foreground mb-1">
                    Confirm new password *
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={inputClass}
                    autoComplete="new-password"
                    disabled={status === "loading"}
                  />
                </div>
                {message && (
                  <p className={`text-sm ${status === "error" ? "text-destructive" : "text-training-success"}`}>
                    {message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {status === "loading" ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            )}

            {hasSession === true && status === "success" && (
              <div className="rounded-lg border border-training-success bg-training-success-muted px-4 py-4">
                <p className="font-medium text-foreground">Password updated</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You’re signed in on this device already. Use your new password next time you sign in.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Go to my dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/", { replace: true })}
                  className="mt-2 w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary"
                >
                  Back to home
                </button>
              </div>
            )}

            {hasSession === null && (
              <p className="text-muted-foreground text-sm">Checking your link…</p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
