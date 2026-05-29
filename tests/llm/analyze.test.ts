import { describe, it, expect, vi } from "vitest";
import { analyze } from "../../src/llm/analyze";
import { EXAMPLE } from "../../src/__fixtures__/analysis";
import type { ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = { baseURL: "b", apiKey: "k", model: "m" };
const good = JSON.stringify(EXAMPLE);

describe("analyze", () => {
  it("returns parsed analysis on first valid response", async () => {
    const chat = vi.fn(async () => good);
    const out = await analyze(
      "give me a call",
      { isWord: false, accent: "GA" },
      cfg,
      { chat },
    );
    expect(out.text).toBe(EXAMPLE.text);
    expect(chat).toHaveBeenCalledTimes(1);
  });
  it("retries once with a repair instruction when first response is invalid", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(good);
    const out = await analyze("x", { isWord: false, accent: "GA" }, cfg, {
      chat,
    });
    expect(out.thoughtGroups.length).toBe(2);
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1][2] as string).toContain("invalid");
  });
  it("throws if the repair attempt is also invalid", async () => {
    const chat = vi.fn(async () => "still not json");
    await expect(
      analyze("x", { isWord: false, accent: "GA" }, cfg, { chat }),
    ).rejects.toBeTruthy();
  });
});
