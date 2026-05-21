export type OpenRouterConfig = {
  apiKey: string;
  generateModel: string;
  auditModel: string;
  repairModel: string;
};

/** Default per-request cap so one slow model cannot hang the edge function indefinitely. */
const OPENROUTER_FETCH_MS = 120_000;

/** Tighter cap for audit calls: 5 run in parallel so each must finish fast. */
export const OPENROUTER_AUDIT_FETCH_MS = 50_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type OpenRouterCallOptions = {
  maxTokens?: number;
  temperature?: number;
  /** Override the per-request network timeout (default 120 s). */
  timeoutMs?: number;
};

export async function callOpenRouter(
  config: OpenRouterConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokensOrOpts: number | OpenRouterCallOptions = 16_000,
  legacyTemperature?: number,
): Promise<string> {
  const opts: OpenRouterCallOptions =
    typeof maxTokensOrOpts === "number"
      ? { maxTokens: maxTokensOrOpts, temperature: legacyTemperature ?? 0.3 }
      : maxTokensOrOpts;
  const maxTokens = opts.maxTokens ?? 16_000;
  const temperature = opts.temperature ?? 0.3;
  const fetchMs = opts.timeoutMs ?? OPENROUTER_FETCH_MS;
  let res: Response;
  try {
    res = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://theukcatpeople.com",
          "X-Title": "UKCAT Question Lab",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      },
      fetchMs,
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        `OpenRouter timed out after ${fetchMs / 1000}s (${model}). Try again or use a faster model.`,
      );
    }
    throw err;
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? `OpenRouter error ${res.status}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("OpenRouter returned empty content.");
  return content.trim();
}
