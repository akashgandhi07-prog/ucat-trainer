export type OpenRouterConfig = {
  apiKey: string;
  generateModel: string;
  auditModel: string;
  repairModel: string;
};

export async function callOpenRouter(
  config: OpenRouterConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 16_000,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
  });

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
