export interface ChatConfig {
  baseURL: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;
}

export class ChatError extends Error {}

export async function chatJSON(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatError(`Chat API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new ChatError("Chat response had no text content");
  return content;
}
