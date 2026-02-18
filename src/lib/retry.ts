/**
 * Retry a promise-returning function with exponential backoff.
 * Use for Supabase inserts/mutations on flaky networks.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  const { retries = 2, baseMs = 500 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      // AbortError means the request was cancelled — retrying won't help
      if (e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted"))) {
        throw e;
      }
      if (attempt < retries) {
        const delay = baseMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
