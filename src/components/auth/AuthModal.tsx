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
  { value: "Undecided", label: "Other" },
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
  const [name, setName] = useState("");
  const [stream, setStream] = useState<Stream>("Undecided");
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
    if (isRegister && !name.trim()) {
      setMessage("Please enter your full name to register.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");
    authLog.info("Sign-in requested", {
      email: trimmedEmail,
      mode,
      hasName: !!name.trim(),
      stream,
    });

    const redirectUrl =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : undefined;
    const options = isRegister
      ? {
          data: {
            full_name: name.trim(),
            stream,
          } as { full_name: string; stream: Stream },
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
    setMessage("Check your email for the sign-in link.");
  };

  const handleClose = () => {
    setEmail("");
    setName("");
    setStream("Undecided");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
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
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="name"
                  disabled={status === "loading"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Stream
                </label>
                <div className="flex flex-wrap gap-2">
                  {STREAM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStream(opt.value)}
                      disabled={status === "loading"}
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        stream === opt.value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
