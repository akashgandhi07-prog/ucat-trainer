# Hostile SRE Audit Report — The UKCAT People

**Audit date:** Feb 2025  
**Scope:** Destructive mindset across Monkey Test, Data Corruption, Accessibility, and Prod Safety.

---

## Executive summary

| Category            | Finding                                                                 | Severity |
|---------------------|-------------------------------------------------------------------------|----------|
| Session on failure  | `getSession()` had no retry → one network blip = silent logout          | **High** |
| Start/Reset spam    | No debounce → rapid clicks caused effect thrash and jank                | **High** |
| ErrorBoundary leak  | Raw `console.error(error, errorInfo)` in prod → stack/internal leak    | **High** |
| Lawyer mode a11y    | Red vs orange hard for deuteranopia → fixed with dashed vs solid       | Medium   |
| Save Progress 3G    | Already has spinner + `withRetry` → OK                                  | OK       |
| Timer on logout     | ReaderEngine uses `mountedRef` → no unmounted setState                  | OK       |
| WPM 0 / 20k         | Clamped 100–600 in ReaderEngine, 200–600 on HomePage → no divide-by-zero| OK       |
| Heavy libs          | No moment/lodash; recharts only for dashboard → acceptable             | OK       |
| console.log in prod | Logger is dev-gated for `info`; `warn`/`error` use redacted meta       | OK       |

---

## Top 3 “App Killers” and fixes

### 1. Session loss on network failure (Data corruption / SRE)

**Risk:** On first load or tab focus, a single failed `getSession()` (e.g. slow 3G, timeout) cleared user and profile with no retry. Users appeared logged out and could lose trust or re-auth unnecessarily.

**Fix applied:** Wrap initial session load in `withRetry` in `useAuth.ts`:

- `withRetry(() => supabase.auth.getSession(), { retries: 2, baseMs: 600 })`
- On final failure, call `.catch()` and then set user/profile to null and loading to false.
- Ensures transient network blips don’t silently drop the session.

**Defensive code (already added):**

```ts
// src/hooks/useAuth.ts
withRetry(
  () => supabase.auth.getSession(),
  { retries: GET_SESSION_RETRIES, baseMs: GET_SESSION_BASE_MS }
)
  .then(({ data: { session }, error }) => { /* ... */ })
  .catch((err) => {
    authLog.error("getSession failed after retries", err);
    if (mounted) {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  });
```

---

### 2. Start / Reset “monkey test” (User behavior)

**Risk:** Clicking Start and Reset many times in quick succession caused repeated effect runs (play → cleanup → play) and many `setState`/RAF cycles. No crash, but jank and risk of races (e.g. double `onFinish` in edge cases).

**Fix applied:** Debounce Play/Pause and Reset in `ReaderEngine.tsx` using a ref and a 400 ms cooldown:

- `lastPlayPauseRef` / `lastResetRef` store last action timestamp.
- If `Date.now() - lastXRef.current < DEBOUNCE_MS`, the handler returns immediately.
- Prevents effect and RAF stacking from rapid clicks.

**Defensive code (already added):**

```ts
// src/components/reader/ReaderEngine.tsx
const lastPlayPauseRef = useRef<number>(0);
const lastResetRef = useRef<number>(0);
const DEBOUNCE_MS = 400;

const handlePlayPause = () => {
  const now = Date.now();
  if (now - lastPlayPauseRef.current < DEBOUNCE_MS) return;
  lastPlayPauseRef.current = now;
  // ... existing logic
};

const handleReset = () => {
  const now = Date.now();
  if (now - lastResetRef.current < DEBOUNCE_MS) return;
  lastResetRef.current = now;
  // ... existing logic
};
```

---

### 3. ErrorBoundary leaking in production (Prod safety)

**Risk:** `componentDidCatch` always called `console.error("ErrorBoundary caught:", error, errorInfo)`, exposing full error and component stack in production (paths, state, internal details).

**Fix applied:** Gate detailed logging to dev; in production log only a short, safe message:

- **Dev:** `console.error("ErrorBoundary caught:", error, errorInfo)` (unchanged).
- **Prod:** `console.error("[ErrorBoundary] Something went wrong. Message:", error?.message ?? "Unknown")` — no stack, no component tree.

**Defensive code (already added):**

```ts
// src/components/ErrorBoundary.tsx
const isDev = import.meta.env.DEV;

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  if (isDev) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  } else {
    console.error("[ErrorBoundary] Something went wrong. Message:", error?.message ?? "Unknown");
  }
}
```

---

## Other findings (short)

- **WPM 0 / 20,000:** ReaderEngine clamps WPM 100–600; HomePage 200–600. No divide-by-zero; `(currentWordIndex / wpm) * 60000` is safe.
- **Save Progress on slow 3G:** ResultsView shows “Saving…” and spinner; `handleSaveProgress` uses `withRetry` for the insert. No change needed.
- **Logout while timer running:** ReaderEngine cleanup sets `mountedRef.current = false` and cancels RAF; no setState after unmount.
- **Lawyer mode (Deuteranopia):** `getLawyerHighlightClass` now uses **dashed** underline for qualifier and **solid** underline + bold for absolute, so distinction doesn’t rely on red vs orange alone.
- **Keyboard (Tab + Space):** Buttons and links are focusable; no custom tabIndex hacks found. Main gap: no skip link or explicit “focus trap” in modals — consider adding for full a11y.
- **Mobile legibility:** Reader text uses `text-[15px] sm:text-[16px]` and sufficient contrast; 100% zoom on mobile is acceptable.
- **Heavy libs:** No moment.js or full lodash; recharts only on dashboard. No change.
- **console.log:** App code uses `logger`; `info` is dev-only; `warn`/`error` use `redactPii` in prod. ErrorBoundary was the only raw console leak; now fixed.

---

## Strictly typed User Session (no `any`)

Session and auth types are centralized and strict; no `any` in session flow.

**Location:** `src/types/session.ts`

**Interfaces:**

```ts
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../lib/profileApi";

/** Authenticated user + profile. Use when you need both identity and profile. No `any`. */
export interface UserSession {
  readonly user: User;
  readonly profile: Profile | null;
}

/** Type guard: narrows to UserSession when user is present. */
export function hasUserSession(state: { user: User | null; profile: Profile | null }): state is UserSession {
  return state.user !== null;
}

/** Auth state exposed to the app (useAuth return type). */
export interface AuthState {
  readonly user: User | null;
  readonly profile: Profile | null;
  readonly loading: boolean;
  readonly isAdmin: boolean;
  refetchProfile: () => Promise<void>;
}

/** Session row as returned from Supabase (sessions table). */
export interface SessionRow {
  id: string;
  user_id: string;
  training_type: "speed_reading" | "rapid_recall" | "keyword_scanning";
  wpm: number | null;
  correct: number;
  total: number;
  created_at: string;
  passage_id: string | null;
  wpm_rating?: string | null;
  time_seconds?: number | null;
}
```

Use `UserSession` wherever you have a guaranteed logged-in user + profile; use `AuthState` for the hook return; use `hasUserSession(state)` to narrow from `AuthState` to `UserSession` without casting.

---

## Files changed in this audit

| File                         | Change |
|-----------------------------|--------|
| `src/hooks/useAuth.ts`      | getSession wrapped in `withRetry` + `.catch()` |
| `src/components/reader/ReaderEngine.tsx` | Debounce Play/Pause and Reset (refs + 400 ms) |
| `src/components/ErrorBoundary.tsx`      | Prod: log only error message, not full error/errorInfo |
| `src/types/session.ts`      | `UserSession` / `AuthState` readonly; added `hasUserSession` guard |
| `src/utils/textAnalysis.ts` | Lawyer mode: qualifier = dashed underline (deuteranopia-safe) |

No new dependencies. `withRetry` and logger were already in use.
