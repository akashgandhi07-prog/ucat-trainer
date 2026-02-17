import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { authLog } from "../../lib/logger";
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
  if (msg.includes("invalid") && msg.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("email not confirmed") || msg.includes("confirm")) {
    return "Please confirm your email using the link we sent.";
  }
  if (msg.includes("disabled") || msg.includes("blocked")) {
    return "This account has been disabled. Contact support if you need help.";
  }
  return FALLBACK_AUTH_ERROR;
}

type Mode = AuthModalMode;

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stream, setStream] = useState<Stream>("Medicine");
  const [entryYear, setEntryYear] = useState<string>("2026");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
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
    const isRegister = mode === "register";
    if (isRegister) {
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
    }

    setStatus("loading");
    setMessage("");
    const fullName =
      isRegister ? `${firstName.trim()} ${lastName.trim()}`.trim() : null;

    authLog.info("Sign-in requested", {
      email: trimmedEmail,
      mode,
      hasName: !!fullName,
      stream,
      entryYear: isRegister ? entryYear : undefined,
    });

    const redirectUrl =
      typeof window !== "undefined" ? window.location.href : undefined;
    const options = isRegister
      ? {
          data: {
            full_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            stream,
            entry_year: entryYear,
            email_marketing_opt_in: true,
          },
          emailRedirectTo: redirectUrl,
        }
      : {
          emailRedirectTo: redirectUrl,
        };

    const { data, error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options,
    });

    if (error) {
      authLog.error("Sign-in failed", {
        message: error.message,
        email: trimmedEmail,
      });
      setStatus("error");
      setMessage(getUserFriendlyAuthError(error.message));
      return;
    }

    const userId = data?.user ? (data.user as { id?: string }).id : undefined;
    authLog.info("Magic link sent", {
      email: trimmedEmail,
      mode,
      userId: userId ?? "pending",
    });
    setStatus("success");
    setMessage(
      "We’ve emailed you a magic login link. Open it to log in, then you can just return to this tab and continue. If a new tab opens, you can close it after the link has loaded."
    );
  };

  const handleClose = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setStream("Medicine");
    setEntryYear("2026");
    setStatus("idle");
    setMessage("");
    setMode("login");
    onClose();
  };

  if (!isOpen) return null;

  const title = mode === "login" ? "Sign in" : "Create an account";
  const submitLabel =
    status === "loading" ? "Sending…" : "Send magic link";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md sm:max-w-lg w-full px-5 sm:px-7 py-6 sm:py-7">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="auth-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
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
          {mode === "register" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-first-name"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    First Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    id="auth-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="given-name"
                    disabled={status === "loading"}
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-last-name"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Last Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    id="auth-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="family-name"
                    disabled={status === "loading"}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="auth-subject"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Subject<span className="text-red-500"> *</span>
                </label>
                <select
                  id="auth-subject"
                  value={stream}
                  onChange={(e) => setStream(e.target.value as Stream)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label
                  htmlFor="auth-entry-year"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Entry Year<span className="text-red-500"> *</span>
                </label>
                <select
                  id="auth-entry-year"
                  value={entryYear}
                  onChange={(e) => setEntryYear(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoComplete="email"
              disabled={status === "loading"}
            />
          </div>
          {mode === "register" && (
            <p className="text-[11px] leading-snug text-slate-500">
              By creating an account, you agree that The UKCAT People may email you UCAT tips, relevant course
              information and occasional marketing updates. You can unsubscribe at any time via the link in each email.
            </p>
          )}
          {message && (
            <p
              className={`text-sm ${
                status === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </p>
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
            {mode === "login" ? (
              <>
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
