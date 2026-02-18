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

          {this.state.error && (
            <div className="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left overflow-auto max-h-96">
              <p className="font-mono text-sm text-red-700 font-bold mb-2">{this.state.error.toString()}</p>
              <pre className="font-mono text-xs text-red-600 whitespace-pre-wrap">{this.state.error.stack}</pre>
            </div>
          )}

          <a href="/" className="text-blue-600 font-medium hover:underline">
            Back to Home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
