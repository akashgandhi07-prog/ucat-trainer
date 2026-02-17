# Security & QA Audit — The UKCAT People

**Stack:** Vite, React, TypeScript, Tailwind, Supabase (Auth + DB)  
**Date:** 2026-02-16  
**Scope:** Auth, data leaks, RLS, quiz logic, regex, performance, mobile UX.

---

## Step 1: Issues by Severity

| # | Severity   | Area            | Issue | Location |
|---|------------|-----------------|--------|----------|
| 1 | **Critical** | Auth            | Dashboard does not redirect when `!user`; it renders "Sign in to view your dashboard" and keeps URL `/dashboard`. No strict redirect like AdminPage. | `src/pages/Dashboard.tsx` |
| 2 | **High**     | Logic / Regex   | `textAnalysis.ts` (Lawyer mode) is unused. If used for full-text scan later, matching should use word boundaries and `gi` for "Many" / "many,". Current `getLawyerHighlight` normalizes per-word so it already handles these; no regex in that file. DistortionQuiz uses `\b` and lowercasing—OK. | `src/utils/textAnalysis.ts` (hardening only if used) |
| 3 | **Medium**   | Auth            | DistortionQuiz has no auth; it is used by ReaderPage/RapidRecallPage which don’t require login. By design only save is gated. If product requires “quiz only when logged in”, add route-level guard. | `ReaderPage.tsx`, `RapidRecallPage.tsx` |
| 4 | **Low**      | Mobile UX       | Chunk Mode is not present in codebase. `useIsMobile` exists (768px). When/if Chunk Mode is added, gate it with `useIsMobile` for screens &lt; 768px. | `src/hooks/useIsMobile.ts` |
| 5 | **Info**     | Security        | No accidental logging of `anon_key` in `src/lib/supabase.ts`. | `src/lib/supabase.ts` |
| 6 | **Info**     | RLS             | Sessions are fetched with `.eq('user_id', user.id)`; RLS policies enforce `auth.uid() = user_id`. Defense in depth confirmed. | `Dashboard.tsx`, `full-schema-setup.sql` |
| 7 | **Info**     | Quiz logic      | DistortionQuiz: `displayedSentence` and `correctAnswer` are derived from the same `isOriginal`; logic is correct and in sync. | `DistortionQuiz.tsx` |
| 8 | **Info**     | Performance     | ReaderEngine cancels `requestAnimationFrame` in the effect cleanup; no leak. | `ReaderEngine.tsx` |
| 9 | **Info**     | Performance     | `paragraphs`/`words` are memoized from `text`; changing WPM does not re-parse text. | `ReaderEngine.tsx` |

---

## Step 2: Fixed Code for Critical/High Issues

### Fix 1 (Critical): Strict redirect on Dashboard when `!user`

Replace the `!user` block in `Dashboard.tsx` so unauthenticated users are redirected instead of seeing a message.

**Current (lines 205–214):**

```tsx
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 mb-4">Sign in to view your dashboard.</p>
        <Link to="/" className="text-blue-600 font-medium hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }
```

**Fixed:**

```tsx
  if (!user) {
    return <Navigate to="/" replace />;
  }
```

**Required import:** Add `Navigate` to the react-router-dom import in `Dashboard.tsx`:

```tsx
import { Link, Navigate } from "react-router-dom";
```

---

### Fix 2 (High): Harden Lawyer-mode matching in `textAnalysis.ts` (optional)

`getLawyerHighlight` already normalizes with `toLowerCase()` and `replace(/[^\w]/g, "")`, so "Many" and "many," are handled when called per word. If you ever add a function that scans full text with regex, use word boundaries and case-insensitive flag. Example helper (optional addition to `textAnalysis.ts`):

```ts
// Optional: use when scanning full text for qualifiers/absolutes
const QUALIFIER_REGEX = /\b(some|many|often|could)\b/gi;
const ABSOLUTE_REGEX = /\b(all|never|always|must)\b/gi;

export function getQualifierMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(QUALIFIER_REGEX)];
}
export function getAbsoluteMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(ABSOLUTE_REGEX)];
}
```

No change required if you only use `getLawyerHighlight(word)` with pre-split words.

---

## Step 3: Quick Win — Error Boundary

**Suggestion:** Add a React Error Boundary so a single component error (e.g. in Recharts, Supabase callback, or quiz) does not blank the whole app.

1. **Create** `src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-600 mb-4">We've been notified. Please try again or go back home.</p>
          <a href="/" className="text-blue-600 font-medium hover:underline">Back to Home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
```

2. **Wrap the app** in `App.tsx`:

```tsx
import { ErrorBoundary } from "./components/ErrorBoundary";

// inside return:
<BrowserRouter>
  <ErrorBoundary>
    <AuthModalProvider>
      ...
    </AuthModalProvider>
  </ErrorBoundary>
</BrowserRouter>
```

This improves perceived stability and gives a single place to add logging or reporting later.
