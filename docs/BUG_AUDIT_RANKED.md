# Bug Audit — Ranked by Severity

Findings from a static and flow-based review of the codebase. Ranked from **critical** to **least critical**.

---

## Critical

*(None identified. No unguarded runtime crashes or security holes found.)*

---

## High

### 1. Auth: `fetchProfile` can set state after unmount

**Where:** `src/contexts/AuthContext.tsx`

**What:** `fetchProfile` is called from `onAuthStateChange` with `if (mounted) await fetchProfile(u.id)`. After the `await`, the component may have unmounted, but `fetchProfile` still calls `setProfile(p)` with no mounted check. That can cause React "setState on unmounted component" warnings and subtle UI bugs.

**Fix:** Pass a mounted (or cancelled) ref into `fetchProfile`, or check a ref at the start of `fetchProfile` after the await and skip `setProfile` if unmounted.

---

### 2. Auth: Loading may never resolve if `INITIAL_SESSION` does not fire

**Where:** `src/contexts/AuthContext.tsx`

**What:** `loading` is set to `false` only in the `INITIAL_SESSION` branch of `onAuthStateChange`. If that event never fires (e.g. old client, edge case, or environment issue per [supabase/auth-js#78](https://github.com/supabase/auth-js/issues/78)), the app can stay in a permanent loading state.

**Fix:** Add a fallback: e.g. call `loadSession()` once on mount (or after a short timeout if `INITIAL_SESSION` has not run), so `setLoading(false)` is always reached.

---

## Medium

### 3. Calculator: Possible division by zero in skip handler

**Where:** `src/components/calculator/DrillModes.tsx` (e.g. ~line 791)

**What:** In the skip `onSkip` path, `accuracyPct` is computed as `(newCorrect / questionCount) * 100` without guarding `questionCount`. `questionCount` comes from `stage?.questionCount ?? 5`, so it is only 0 if a stage is misconfigured with `questionCount: 0`.

**Fix:** Use the same guard as elsewhere:  
`const accuracyPct = questionCount > 0 ? (newCorrect / questionCount) * 100 : 0;`

---

### 4. `parseInt` without radix

**Where:**  
- `src/utils/analyticsStorage.ts` — `parseInt(session.timeTaken)`  
- `src/components/bug/BugReportModal.tsx` uses `parseInt(..., 10)` correctly.

**What:** `parseInt(string)` without a second argument can behave unexpectedly for leading-zero or hex strings. Using radix `10` is safer and clearer.

**Fix:** Use `parseInt(session.timeTaken, 10)` (and ensure any other `parseInt` calls use an explicit radix where appropriate).

---

## Low / Least critical

### 5. Bug report submit button not disabled when description empty

**Where:** `src/components/bug/BugReportModal.tsx`

**What:** The submit button is disabled for `status === "loading"` and rate limit only. Empty description is still validated by the form schema on submit, so submission is prevented, but the button can be clicked and then show validation errors.

**Fix (optional):** Disable the button when `!watch("description")?.trim()` (or equivalent) for better UX.

---

### 6. Supabase URL/key in client for analytics

**Where:** `src/lib/analytics.ts` (e.g. `sendAbandonmentSync`)

**What:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used in the client. Supabase’s anon key is intended to be public; this is acceptable as long as RLS and policies are correct. No change needed unless you have stricter requirements.

**Action:** Document or leave as-is; not a bug.

---

### 7. Minor: `loadSession` never called on initial mount

**Where:** `src/contexts/AuthContext.tsx`

**What:** Initial auth state is driven only by `onAuthStateChange` (INITIAL_SESSION). `loadSession()` exists and is used for `retryGetSession` but is not used on first load. Tied to High #2: if INITIAL_SESSION is unreliable, having a one-time fallback that calls `loadSession()` would make loading more robust.

**Fix:** Add fallback as in High #2.

---

## Summary

| Severity  | Count | Action |
|----------|-------|--------|
| Critical | 0     | — |
| High     | 2     | Fix auth unmount and loading fallback |
| Medium   | 2     | Guard division, use parseInt radix |
| Low      | 3     | Optional UX and documentation |

Recommended order of work: **High 1 & 2** → **Medium 3 & 4** → optional Low items.
