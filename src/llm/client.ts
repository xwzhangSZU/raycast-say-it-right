export interface ChatConfig {
  baseURL: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;
  extraBody?: Record<string, unknown>; // provider-specific extra body fields (e.g. Qwen enable_thinking)
  /** Header that carries the API key. Default sends `Authorization: Bearer <key>`;
   * set e.g. "api-key" to send the raw key under that header (MiMo). */
  authHeader?: string;
}

export class ChatError extends Error {}

const TIMEOUT_MS = 60_000;

export async function chatJSON(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const authHeaders: Record<string, string> = cfg.authHeader
    ? { [cfg.authHeader]: cfg.apiKey }
    : { Authorization: `Bearer ${cfg.apiKey}` };
  const request = (useJsonFormat: boolean) => {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0, // analysis is not creative — keep it deterministic across runs
      ...(cfg.extraBody ?? {}),
    };
    if (useJsonFormat) body.response_format = { type: "json_object" };
    return fetchImpl(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  };

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await request(true);
    // Some models/endpoints reject response_format json_object → retry without it.
    if (res.status === 400) res = await request(false);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ChatError(
        `Request to the model timed out after ${TIMEOUT_MS / 1000}s. Check your network, and that the Qwen Region matches your API key (Beijing for mainland-China keys, International otherwise).`,
      );
    }
    throw new ChatError(
      `Network error calling the model: ${String(err).slice(0, 150)}`,
    );
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
