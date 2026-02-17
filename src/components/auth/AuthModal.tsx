import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { authLog } from "../../lib/logger";
import type { Stream } from "../../lib/profileApi";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const STREAM_OPTIONS: { value: Stream; label: string }[] = [
  { value: "Medicine", label: "Medicine" },
  { value: "Dentistry", label: "Dentistry" },
  { value: "Undecided", label: "Other" },
];

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
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
    if (!trimmedEmail) return;

    setStatus("loading");
    setMessage("");
    authLog.info("Sign-in requested", { email: trimmedEmail, hasName: !!name.trim(), stream });

    const metadata: { full_name?: string; stream: Stream } = { stream };
    if (name.trim()) metadata.full_name = name.trim();

    const { data, error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { data: metadata },
    });

    if (error) {
      authLog.error("Sign-in failed", { message: error.message, email: trimmedEmail });
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const userId = data?.user ? (data.user as { id?: string }).id : undefined;
    authLog.info("Magic link sent", {
      email: trimmedEmail,
      hasName: !!name.trim(),
      stream,
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900">
            Register or sign in
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
          <div>
            <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
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
              {status === "loading" ? "Sending…" : "Send magic link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
