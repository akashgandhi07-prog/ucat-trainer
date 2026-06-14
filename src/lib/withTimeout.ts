/**
 * Wall-clock timeout for a promise.
 *
 * Several dashboard/card fetches awaited Supabase with no time cap: if the
 * connection stalls (rather than returning an error), the promise never settles
 * and that section stays stuck on a skeleton while the rest of the page loads -
 * the "had to refresh once or twice" symptom. Wrapping reads in withTimeout lets
 * the caller fall back to an empty/error state on a hang instead of hanging too.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 10_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Like withTimeout but resolves to `fallback` on timeout/rejection instead of throwing. */
export async function withTimeoutOr<T>(
  promise: PromiseLike<T>,
  fallback: T,
  ms = 10_000,
): Promise<T> {
  try {
    return await withTimeout(promise, ms);
  } catch {
    return fallback;
  }
}
