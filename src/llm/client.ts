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
  const request = (useJsonFormat: boolean) => {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    };
    if (useJsonFormat) body.response_format = { type: "json_object" };
    return fetchImpl(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  };

  let res = await request(true);
  // Some models/endpoints don't support response_format json_object → retry without it.
  if (res.status === 400) {
    res = await request(false);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatError(`Chat API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new ChatError("Chat response had no text content");
  return content;
}
