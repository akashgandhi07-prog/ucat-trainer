const ENABLED_KEY = "ukcat-guided-chunking-enabled";
const SIZE_KEY = "ukcat-guided-chunk-size";

export const GUIDED_CHUNK_MIN = 1;
export const GUIDED_CHUNK_MAX = 6;
export const GUIDED_CHUNK_DEFAULT = 3;

export type GuidedChunkingPrefs = {
  enabled: boolean;
  chunkSize: number;
};

export function clampChunkSize(size: number): number {
  if (!Number.isFinite(size)) return GUIDED_CHUNK_DEFAULT;
  return Math.min(GUIDED_CHUNK_MAX, Math.max(GUIDED_CHUNK_MIN, Math.round(size)));
}

export function loadGuidedChunkingPrefs(): GuidedChunkingPrefs {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      chunkSize: GUIDED_CHUNK_DEFAULT,
    };
  }

  try {
    const enabledRaw = window.localStorage.getItem(ENABLED_KEY);
    const sizeRaw = window.localStorage.getItem(SIZE_KEY);

    const enabled = enabledRaw === "true";
    const parsedSize = sizeRaw != null ? parseInt(sizeRaw, 10) : NaN;

    return {
      enabled,
      chunkSize: clampChunkSize(parsedSize),
    };
  } catch {
    return {
      enabled: false,
      chunkSize: GUIDED_CHUNK_DEFAULT,
    };
  }
}

export function saveGuidedChunkingPrefs(prefs: GuidedChunkingPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENABLED_KEY, prefs.enabled ? "true" : "false");
    window.localStorage.setItem(SIZE_KEY, String(clampChunkSize(prefs.chunkSize)));
  } catch {
    // ignore storage errors
  }
}

/**
 * Compute a simple next-session chunk-size suggestion.
 * - If accuracy is high, suggest a slightly larger chunk.
 * - If accuracy is low, suggest a slightly smaller chunk.
 * - Otherwise, keep the same size.
 */
export function getSuggestedChunkSize(currentSize: number, accuracyPercent: number): number | null {
  if (!Number.isFinite(accuracyPercent)) return null;

  const size = clampChunkSize(currentSize);

  if (accuracyPercent >= 80 && size < GUIDED_CHUNK_MAX) {
    return clampChunkSize(size + 1);
  }

  if (accuracyPercent <= 50 && size > GUIDED_CHUNK_MIN) {
    return clampChunkSize(size - 1);
  }

  return null;
}

