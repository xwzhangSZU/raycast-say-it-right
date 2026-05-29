import { describe, it, expect } from "vitest";
import { resolveTtsProvider, resolveTtsConfig, buildTtsInstructions } from "../../src/tts/index";

describe("resolveTtsProvider", () => {
  it("follows the analysis provider by default", () => {
    expect(resolveTtsProvider("qwen", {})).toBe("qwen");
  });
  it("honors an explicit override", () => {
    expect(resolveTtsProvider("qwen", { ttsProvider: "openai" })).toBe("openai");
  });
});

describe("resolveTtsConfig", () => {
  it("uses gpt-4o-mini-tts for OpenAI", () => {
    const c = resolveTtsConfig("openai", { openaiApiKey: "sk", openaiTtsVoice: "nova" });
    expect(c.model).toBe("gpt-4o-mini-tts");
    expect(c.voice).toBe("nova");
  });
  it("uses the DashScope /api/v1 base for Qwen", () => {
    const c = resolveTtsConfig("qwen", { qwenApiKey: "sk", qwenRegion: "beijing" });
    expect(c.baseURL).toBe("https://dashscope.aliyuncs.com/api/v1");
    expect(c.model).toBe("qwen3-tts-flash");
  });
});

describe("buildTtsInstructions", () => {
  it("adds a slow-pace clause only when slow", () => {
    expect(buildTtsInstructions(false, "0.6")).not.toMatch(/slowly/);
    expect(buildTtsInstructions(true, "0.5")).toContain("50%");
  });
});
