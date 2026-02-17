import { Component, type ErrorInfo, type ReactNode } from "react";

const isDev = import.meta.env.DEV;

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDev) {
      console.error("ErrorBoundary caught:", error, errorInfo);
    } else {
      console.error("[ErrorBoundary] Something went wrong. Message:", error?.message ?? "Unknown");
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-600 mb-4">
            We&apos;ve been notified. Please try again or go back home.
          </p>
          <a href="/" className="text-blue-600 font-medium hover:underline">
            Back to Home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
