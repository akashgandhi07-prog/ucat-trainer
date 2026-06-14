import { lazy, type ComponentType } from "react";

/**
 * Drop-in replacement for React.lazy that survives chunk-load failures.
 *
 * Route chunks can fail to load for two reasons:
 *  1. A transient network blip while fetching the chunk.
 *  2. A new deploy: the user's cached index.html points at old hashed chunk
 *     filenames that no longer exist on the CDN, so the import 404s.
 *
 * Without handling, either case leaves the page stuck until a manual refresh
 * (the "I have to refresh once or twice" symptom). We retry once after a short
 * delay for (1), then force a single hard reload for (2). A sessionStorage flag
 * keyed to the deploy guarantees we never reload-loop: if a reload has already
 * been tried this session and the import still fails, we surface the error to
 * the ErrorBoundary instead.
 */

const RELOAD_FLAG_PREFIX = "chunk_reload_";

function hasReloadedFor(key: string): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function markReloadedFor(key: string): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG_PREFIX + key, "1");
  } catch {
    /* ignore quota / privacy mode */
  }
}

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  chunkKey: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      // One quick in-place retry handles a transient network failure without a
      // full reload (keeps any unsaved page state intact).
      try {
        await wait(400);
        return await factory();
      } catch (retryErr) {
        if (!isChunkLoadError(retryErr)) throw retryErr;
        // Stale deploy: the chunk genuinely isn't there. Hard reload once to pull
        // the fresh index.html and its new chunk hashes.
        if (!hasReloadedFor(chunkKey)) {
          markReloadedFor(chunkKey);
          window.location.reload();
          // Return a never-resolving module so React keeps the Suspense fallback
          // up during the reload instead of flashing the error screen.
          await new Promise(() => {});
        }
        throw retryErr;
      }
    }
  });
}
