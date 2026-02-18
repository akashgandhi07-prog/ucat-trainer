import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { authLog } from "../../lib/logger";
import { validatePassword, getPasswordRequirementHint } from "../../lib/passwordValidation";
import type { Stream } from "../../lib/profileApi";
import type { AuthModalMode } from "../../contexts/AuthModalContext";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
};

const STREAM_OPTIONS: { value: Stream; label: string }[] = [
  { value: "Medicine", label: "Medicine" },
  { value: "Dentistry", label: "Dentistry" },
  { value: "Veterinary Medicine", label: "Veterinary Medicine" },
  { value: "Other", label: "Other" },
];

const ENTRY_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: "2026", label: "2026 Entry (Starting University September 2026)" },
  { value: "2027", label: "2027 Entry (Starting University September 2027)" },
  { value: "2028", label: "2028 Entry (Starting University September 2028)" },
  { value: "2029", label: "2029 Entry (Starting University September 2029)" },
  { value: "Other", label: "Other" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

const FALLBACK_AUTH_ERROR = "Something went wrong. Please try again.";

function getUserFriendlyAuthError(rawMessage: string): string {
  const msg = rawMessage?.toLowerCase() ?? "";
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many requests. Please wait a few minutes and try again.";
  }
  if (msg.includes("invalid login") || msg.includes("invalid_credentials") || msg.includes("invalid credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (msg.includes("invalid") && msg.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("email not confirmed") || msg.includes("confirm")) {
    return "Please confirm your email using the link we sent.";
  }
  if (msg.includes("disabled") || msg.includes("blocked")) {
    return "This account has been disabled. Contact support if you need help.";
  }
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short") || msg.includes("length"))) {
    return "Password does not meet requirements. " + getPasswordRequirementHint();
  }
  return FALLBACK_AUTH_ERROR;
}

type Mode = AuthModalMode;

function getResetRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const path = "/reset-password";
  return `${origin}${path}`;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stream, setStream] = useState<Stream>("Medicine");
  const [entryYear, setEntryYear] = useState<string>("2026");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("Please enter your email.");
      setStatus("error");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    if (mode === "forgot") {
      setStatus("loading");
      setMessage("");
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getResetRedirectUrl(),
      });
      if (error) {
        authLog.error("Password reset request failed", { message: error.message, email: trimmedEmail });
        setStatus("error");
        setMessage(getUserFriendlyAuthError(error.message));
        return;
      }
      authLog.info("Password reset email sent", { email: trimmedEmail });
      setStatus("success");
      setMessage("Check your email for a link to set a new password. The link expires in 1 hour.");
      return;
    }

    if (mode === "login") {
      if (!password) {
        setMessage("Please enter your password.");
        setStatus("error");
        return;
      }
      setStatus("loading");
      setMessage("");
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        authLog.error("Sign-in failed", { message: error.message, email: trimmedEmail });
        setStatus("error");
        setMessage(getUserFriendlyAuthError(error.message));
        return;
      }
      authLog.info("Signed in", { email: trimmedEmail });
      handleClose();
      return;
    }

    // register
    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Please enter your first and last name to register.");
      setStatus("error");
      return;
    }
    if (!stream) {
      setMessage("Please select your subject.");
      setStatus("error");
      return;
    }
    if (!entryYear) {
      setMessage("Please select your entry year.");
      setStatus("error");
      return;
    }
    if (!password) {
      setMessage("Please enter a password.");
      setStatus("error");
      return;
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setMessage(passwordResult.message);
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
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    authLog.info("Registration requested", {
      email: trimmedEmail,
      hasName: !!fullName,
      stream,
      entryYear,
    });

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          stream,
          entry_year: entryYear,
          email_marketing_opt_in: true,
        },
      },
    });

    if (error) {
      authLog.error("Sign-up failed", { message: error.message, email: trimmedEmail });
      setStatus("error");
      setMessage(getUserFriendlyAuthError(error.message));
      return;
    }

    if (data?.user?.identities?.length === 0) {
      setStatus("error");
      setMessage("An account with this email already exists. Sign in instead or use “Forgot password?” to reset.");
      return;
    }

    authLog.info("Account created", { email: trimmedEmail, userId: data?.user?.id });
    setStatus("success");
    setMessage(
      data?.user?.confirmed_at
        ? "Account created. You’re signed in."
        : "Account created. Please check your email to confirm your address, then sign in with your password."
    );

    // Add to Mailchimp audience (fire-and-forget; registration continues either way)
    if (data?.user && import.meta.env.VITE_SUPABASE_URL) {
      supabase.functions
        .invoke("add-mailchimp-subscriber", {
          body: {
            email: trimmedEmail,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        })
        .then(({ error }) => {
          if (error) authLog.warn("Mailchimp subscribe failed", { error: error?.message });
        })
        .catch(() => { });
    }

    if (data?.user?.confirmed_at) {
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setStream("Medicine");
    setEntryYear("2026");
    setStatus("idle");
    setMessage("");
    setMode("login");
    onClose();
  }, [onClose]);

  // Fix #10: close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isForgot = mode === "forgot";
  const isRegister = mode === "register";
  const title = isForgot ? "Reset password" : isRegister ? "Create an account" : "Sign in";
  const submitLabel =
    status === "loading" ? "Please wait…" : isForgot ? "Send reset link" : isRegister ? "Create account" : "Sign in";

  const inputClass =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md sm:max-w-lg w-full px-5 sm:px-7 py-6 sm:py-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 -m-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-first-name" className="block text-sm font-medium text-slate-700 mb-1">
                    First Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    id="auth-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={inputClass}
                    autoComplete="given-name"
                    disabled={status === "loading"}
                  />
                </div>
                <div>
                  <label htmlFor="auth-last-name" className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    id="auth-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={inputClass}
                    autoComplete="family-name"
                    disabled={status === "loading"}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-subject" className="block text-sm font-medium text-slate-700 mb-1">
                  Subject<span className="text-red-500"> *</span>
                </label>
                <select
                  id="auth-subject"
                  value={stream}
                  onChange={(e) => setStream(e.target.value as Stream)}
                  className={inputClass + " text-sm bg-white"}
                  disabled={status === "loading"}
                >
                  {STREAM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="auth-entry-year" className="block text-sm font-medium text-slate-700 mb-1">
                  Entry Year<span className="text-red-500"> *</span>
                </label>
                <select
                  id="auth-entry-year"
                  value={entryYear}
                  onChange={(e) => setEntryYear(e.target.value)}
                  className={inputClass + " text-sm bg-white"}
                  disabled={status === "loading"}
                >
                  {ENTRY_YEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              required
              autoComplete="email"
              disabled={status === "loading"}
            />
          </div>

          {!isForgot && (
            <>
              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password{isRegister ? " *" : ""}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Choose a strong password" : "Your password"}
                  className={inputClass}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  disabled={status === "loading"}
                />
                {isRegister && (
                  <p className="mt-1 text-xs text-slate-500">{getPasswordRequirementHint()}</p>
                )}
              </div>
              {isRegister && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm password *
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className={inputClass}
                    autoComplete="new-password"
                    disabled={status === "loading"}
                  />
                </div>
              )}
            </>
          )}

          {isRegister && (
            <p className="text-[11px] leading-snug text-slate-500">
              By creating an account, you agree that TheUKCATPeople may email you UCAT tips, relevant course
              information and occasional marketing updates. You can unsubscribe at any time via the link in each email.
            </p>
          )}

          {message && (
            <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>{message}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">
            {isForgot ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </>
            ) : mode === "login" ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Forgot password?
                </button>
                {" · "}
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
