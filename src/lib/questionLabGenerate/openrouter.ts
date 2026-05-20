export type OpenRouterConfig = {
  apiKey: string;
  generateModel: string;
  auditModel: string;
  repairModel: string;
};

/** Per-request cap so one slow model cannot hang the edge function indefinitely. */
const OPENROUTER_FETCH_MS = 120_000;

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

export async function callOpenRouter(
  config: OpenRouterConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 16_000,
): Promise<string> {
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
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      },
      OPENROUTER_FETCH_MS,
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        `OpenRouter timed out after ${OPENROUTER_FETCH_MS / 1000}s (${model}). Try again or use a faster model.`,
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
