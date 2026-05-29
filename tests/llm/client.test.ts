import { describe, it, expect, vi } from "vitest";
import { chatJSON, ChatError, type ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = {
  baseURL: "https://api.test/v1",
  apiKey: "sk-x",
  model: "m",
};

function mockFetch(status: number, json: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  })) as unknown as typeof fetch;
}

describe("chatJSON", () => {
  it("POSTs to /chat/completions with auth + json_object and returns content", async () => {
    const f = mockFetch(200, {
      choices: [{ message: { content: '{"ok":true}' } }],
    });
    const out = await chatJSON(cfg, "sys", "usr", f);
    expect(out).toBe('{"ok":true}');
    const [url, init] = (
      f as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-x",
    );
    expect(init.body).toContain('"json_object"');
  });
  it("throws ChatError on non-2xx", async () => {
    const f = mockFetch(401, { error: "bad key" });
    await expect(chatJSON(cfg, "s", "u", f)).rejects.toBeInstanceOf(ChatError);
  });
});
