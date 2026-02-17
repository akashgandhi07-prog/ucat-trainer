# Hostile User & SRE Audit - The UKCAT People

**Mindset:** Destructive testing, failure modes, and production resilience.  
**Date:** 2026-02-16

---

## Summary: Top 3 "App Killers"

| Rank | Killer | Impact | Fix |
|------|--------|--------|-----|
| **1** | Save Progress hangs on slow 3G; no loading state; double-click can fire multiple inserts | Lost progress, duplicate rows, user thinks app is broken | Add `saving` state, disable button, show spinner; debounce/guard submit |
| **2** | ReaderEngine rAF callback can call `setState` after unmount (e.g. user navigates away while playing) | React warning, possible memory leak, erratic UI if user returns | Guard all setState in rAF/tick with a `mounted` ref; check before `setCurrentWordIndex` / `setIsPlaying` |
| **3** | Supabase insert has no retry; single network blip loses session save | Silent data loss, poor UX on flaky networks | Add a small retry helper (e.g. 2 retries, exponential backoff) and use it for session inserts |

---

## 1. App Killer #1 - Save Progress hang & double-submit

**Problem:**  
- "Save Progress" has no loading state. On slow 3G the button does nothing visible and the request can take many seconds.  
- User may click again → multiple inserts (duplicate sessions).  
- No timeout; request can hang until browser gives up.

**Defensive code:**

- **ResultsView (Speed Reading):** Add `saving` and `onSaveProgress` returning a Promise or accepting a callback so the parent can set saving. Parent (ReaderPage) sets `saving` true before insert and false after, and passes `saving` into ResultsView so the Save button shows a spinner and is disabled.
- **RapidRecallPage:** Same: local `saving` state, set true before `supabase.from("sessions").insert`, false in finally; disable button and show "Saving…" while `saving`.

**Implementation:** See `ResultsView.tsx` (prop `saving`), `ReaderPage.tsx` (state `saveInProgress`), `RapidRecallPage.tsx` (state `saving`), and optional debounce (e.g. `useRef` to ignore rapid repeat clicks within 2s).

---

## 2. App Killer #2 - Unmounted component state update (ReaderEngine)

**Problem:**  
- When the user navigates away (or logs out) while the reader is playing, the `requestAnimationFrame` loop may still run. The next `tick()` calls `setCurrentWordIndex(index)` or `setIsPlaying(false)` after the component has unmounted → React warning and possible leak.

**Defensive code:**

- Add a `mountedRef` (e.g. `useRef(true)`). In the effect that starts the rAF loop: set `mountedRef.current = true` at the top; in the cleanup set `mountedRef.current = false`. Inside `tick()`, before any `setCurrentWordIndex` or `setIsPlaying`, check `if (!mountedRef.current) return;` and do not schedule the next rAF if unmounted.

```tsx
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  if (!isPlaying) return;
  const tick = () => {
    if (!mountedRef.current) return;
    // ... existing logic, then:
    if (index >= words.length) {
      if (!mountedRef.current) return;
      setIsPlaying(false);
      // ...
      return;
    }
    if (!mountedRef.current) return;
    setCurrentWordIndex(index);
    rafRef.current = requestAnimationFrame(tick);
  };
  // ...
  return () => {
    mountedRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, [isPlaying, wpm, words.length]);
```

---

## 3. App Killer #3 - No retry on Supabase insert

**Problem:**  
- `supabase.from("sessions").insert(...)` is called once. On network failure or 5xx, the promise rejects or returns error and we only set `saveError`. No retry → one transient failure = lost save.

**Defensive code:**

- Add a small `withRetry<T>(fn: () => Promise<T>, options?: { retries?: number; baseMs?: number })` helper (e.g. in `src/lib/supabase.ts` or `src/lib/retry.ts`). On failure, retry up to 2 times with exponential backoff (e.g. 500ms, 1000ms). Use it to wrap the insert in ReaderPage and RapidRecallPage (and optionally KeywordScanningPage). Only set `saveError` after all retries are exhausted.

---

## Other findings (by category)

### Monkey test

- **Start/Reset 50x:** ReaderEngine: Start toggles `isPlaying`; effect cleanup cancels rAF. Only one rAF runs at a time. Reset clears state. No interval stacking.  
- **RapidRecallPage timer:** Single `setInterval` when `phase === "reading"`; cleanup clears it. No stacking unless phase flips repeatedly (not exposed by UI).  
- **WPM 0 or 20,000:** ReaderEngine and HomePage clamp WPM (100-600 and 200-600). No divide-by-zero.  
- **Save Progress:** Covered above (loading + retry).

### Data corruption / state

- **Lawyer Mode:** `getLawyerHighlight` / Lawyer Mode are not yet wired in the UI (only in `textAnalysis.ts`). When added, ensure switching mode resets reader key or passage so old text/state does not persist.  
- **Log out while timer running:** Auth change unmounts or re-renders; interval/rAF cleanup runs on unmount. ReaderEngine still needs the mounted ref (above) for the rAF tick.  
- **Supabase session on network fail:** Auth session is stored in localStorage by Supabase; we don’t lose login. Only the insert fails; retry addresses that.

### Accessibility

- **Lawyer Mode red/orange (Deuteranopia):** Red and orange can be indistinguishable. **Fix:** In `getLawyerHighlightClass`, add a non-color cue: e.g. qualifier `underline decoration-orange-500`, absolute `underline decoration-red-600 font-bold` or a pattern (e.g. `underline` for one, `underline decoration-double` for the other).  
- **Mobile legibility:** Body text uses 15-16px and UCAT font; ensure min font-size and touch targets (e.g. 44px) are kept.  
- **Keyboard:** Buttons are focusable by default. Add visible focus rings (e.g. `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`) and ensure modals trap focus where applicable.

### Prod / build

- **Heavy libs:** No moment.js or full lodash; only Supabase, React, Recharts. Acceptable.  
- **console.log:** Only in `logger.ts` (dev-only for `info`) and `ErrorBoundary` (`console.error`). Logger redacts PII in production for warn/error. No raw `console.log` of user data in prod paths.

---

## User Session - strictly typed interface (no `any`)

Use a single, strictly typed representation of “user session” (auth user + profile) so callers never rely on `any`:

```ts
// src/types/session.ts

import type { User } from "@supabase/supabase-js";
import type { Profile } from "../lib/profileApi";

/** Authenticated user + profile. Use when you need both identity and profile. */
export interface UserSession {
  user: User;
  profile: Profile | null;
}

/** Auth state exposed to the app. */
export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
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

Use `AuthState` for `useAuth()` return type and `UserSession` where you have a non-null user and optional profile (e.g. after checking `if (user)`). Avoid `any` in session-related props and handlers.
