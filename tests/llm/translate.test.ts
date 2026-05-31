import { describe, it, expect, vi } from "vitest";
import {
  buildTranslationPrompt,
  resolveTranslationTarget,
  translateText,
} from "../../src/llm/translate";
import type { ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = {
  baseURL: "https://api.test/v1",
  apiKey: "sk",
  model: "m",
};

describe("translation prompt", () => {
  it("builds a meaning-first Chinese translation prompt", () => {
    const prompt = buildTranslationPrompt({
      text: "Could you turn it off?",
      targetLanguage: "zh-Hans",
      targetLanguageTitle: "Chinese Simplified",
      style: "balanced",
      promptProfile: "general",
    });

    expect(prompt.system).toContain("meaning-first translator");
    expect(prompt.system).toContain("not as English syntax rewritten");
    expect(prompt.user).toContain("Target language: Chinese Simplified.");
    expect(prompt.user).toContain("Could you turn it off?");
  });

  it("resolves target language titles", () => {
    expect(resolveTranslationTarget("auto", "你好")).toEqual({
      language: "en",
      title: "English",
    });
  });
});

describe("translateText", () => {
  it("calls the model without JSON mode and strips accidental fences", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "```text\n请把它关掉好吗？\n```" } }],
      }),
      text: async () => "",
    })) as unknown as typeof fetch;

    const out = await translateText(
      "Could you turn it off?",
      cfg,
      "zh-Hans",
      fetchImpl,
    );

    expect(out.translation).toBe("请把它关掉好吗？");
    const body = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0][1].body as string;
    expect(body).not.toContain("response_format");
  });
});
