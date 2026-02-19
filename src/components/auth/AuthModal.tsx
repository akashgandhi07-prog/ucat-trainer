import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../../lib/supabase";
import { authLog } from "../../lib/logger";
import { getPasswordRequirementHint } from "../../lib/passwordValidation";
import { getAuthSchema, type AuthFormData } from "../../lib/authSchema";
import { trackEvent } from "../../lib/analytics";
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

/** Used for email confirmation link so users land on your domain (e.g. production) not Supabase default. */
function getEmailConfirmRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Sync mode to initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset modal tab when opened
      setMode(initialMode);
      trackEvent("auth_modal_opened", { trigger: initialMode });
    }
  }, [isOpen, initialMode]);

  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: (values, context, options) =>
      zodResolver(getAuthSchema(mode))(values, context, options),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      stream: "Medicine",
      entryYear: "2026",
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    const trimmedEmail = data.email.trim();

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
      setStatus("loading");
      setMessage("");
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: data.password!,
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
    setStatus("loading");
    setMessage("");
    const firstName = (data.firstName ?? "").trim();
    const lastName = (data.lastName ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    authLog.info("Registration requested", {
      email: trimmedEmail,
      hasName: !!fullName,
      stream: data.stream,
      entryYear: data.entryYear,
    });

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: data.password!,
      options: {
        emailRedirectTo: getEmailConfirmRedirectUrl(),
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          stream: data.stream!,
          entry_year: data.entryYear!,
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

    if (signUpData?.user?.identities?.length === 0) {
      setStatus("error");
      setMessage("An account with this email already exists. Sign in instead or use “Forgot password?” to reset.");
      return;
    }

    authLog.info("Account created", { email: trimmedEmail, userId: signUpData?.user?.id });
    trackEvent("sign_up");
    setStatus("success");
    setMessage(
      signUpData?.user?.confirmed_at
        ? "Account created. You’re signed in."
        : "Account created. Please check your email to confirm your address, then sign in with your password."
    );

    // Add to Mailchimp audience (fire-and-forget; registration continues either way)
    if (signUpData?.user && import.meta.env.VITE_SUPABASE_URL) {
      supabase.functions
        .invoke("add-mailchimp-subscriber", {
          body: {
            email: trimmedEmail,
            firstName,
            lastName,
            stream: data.stream ?? undefined,
            entryYear: data.entryYear ?? undefined,
          },
        })
        .then(({ error }) => {
          if (error) authLog.warn("Mailchimp subscribe failed", { error: error?.message });
        })
        .catch(() => { });
    }

    if (signUpData?.user?.confirmed_at) {
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    reset({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      stream: "Medicine",
      entryYear: "2026",
    });
    setStatus("idle");
    setMessage("");
    setMode("login");
    onClose();
  }, [onClose, reset]);

  const isForgot = mode === "forgot";
  const isRegister = mode === "register";
  const title = isForgot ? "Reset password" : isRegister ? "Create an account" : "Sign in";
  const submitLabel =
    status === "loading" ? "Please wait…" : isForgot ? "Send reset link" : isRegister ? "Create account" : "Sign in";

  const inputClass =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md sm:max-w-lg max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-white rounded-2xl shadow-xl px-5 sm:px-7 py-6 sm:py-7 outline-none"
          aria-labelledby="auth-modal-title"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title id="auth-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 -m-2"
                aria-label="Close"
              >
                ×
              </button>
            </Dialog.Close>
          </div>
        <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
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
                    placeholder="First name"
                    className={inputClass}
                    autoComplete="given-name"
                    disabled={status === "loading"}
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="auth-last-name" className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    id="auth-last-name"
                    type="text"
                    placeholder="Last name"
                    className={inputClass}
                    autoComplete="family-name"
                    disabled={status === "loading"}
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="auth-subject" className="block text-sm font-medium text-slate-700 mb-1">
                  Subject<span className="text-red-500"> *</span>
                </label>
                <Controller
                  name="stream"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="auth-subject"
                      className={inputClass + " text-sm bg-white"}
                      disabled={status === "loading"}
                      {...field}
                    >
                      {STREAM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.stream && (
                  <p className="mt-1 text-sm text-red-600">{errors.stream.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="auth-entry-year" className="block text-sm font-medium text-slate-700 mb-1">
                  Entry Year<span className="text-red-500"> *</span>
                </label>
                <Controller
                  name="entryYear"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="auth-entry-year"
                      className={inputClass + " text-sm bg-white"}
                      disabled={status === "loading"}
                      {...field}
                    >
                      {ENTRY_YEAR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.entryYear && (
                  <p className="mt-1 text-sm text-red-600">{errors.entryYear.message}</p>
                )}
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
              placeholder="you@example.com"
              className={inputClass}
              autoComplete="email"
              disabled={status === "loading"}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
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
                  placeholder={isRegister ? "Choose a strong password" : "Your password"}
                  className={inputClass}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  disabled={status === "loading"}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
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
                    placeholder="Confirm password"
                    className={inputClass}
                    autoComplete="new-password"
                    disabled={status === "loading"}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
