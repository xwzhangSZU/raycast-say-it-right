import { describe, it, expect } from "vitest";
import {
  resolveTtsProvider,
  resolveTtsConfig,
  buildTtsInstructions,
} from "../../src/tts/index";

describe("resolveTtsProvider", () => {
  it("follows the analysis provider by default", () => {
    expect(resolveTtsProvider("qwen", {})).toBe("qwen");
  });
  it("honors an explicit override", () => {
    expect(resolveTtsProvider("qwen", { ttsProvider: "openai" })).toBe(
      "openai",
    );
  });
  it("lets mimo speak when following the analysis provider", () => {
    expect(resolveTtsProvider("mimo", {})).toBe("mimo");
  });
  it("falls back off gemini (no TTS) to a configured TTS provider", () => {
    expect(resolveTtsProvider("gemini", { qwenApiKey: "sk" })).toBe("qwen");
  });
});

describe("resolveTtsConfig", () => {
  it("uses gpt-4o-mini-tts for OpenAI", () => {
    const c = resolveTtsConfig("openai", {
      openaiApiKey: "sk",
      openaiTtsVoice: "nova",
    });
    expect(c.model).toBe("gpt-4o-mini-tts");
    expect(c.voice).toBe("nova");
  });
  it("uses the DashScope /api/v1 base for Qwen", () => {
    const c = resolveTtsConfig("qwen", {
      qwenApiKey: "sk",
      qwenRegion: "beijing",
    });
    expect(c.baseURL).toBe("https://dashscope.aliyuncs.com/api/v1");
    expect(c.model).toBe("qwen3-tts-flash");
  });
  it("builds MiMo TTS config (mimo-v2.5-tts, default Chloe voice)", () => {
    const c = resolveTtsConfig("mimo", { mimoApiKey: "tp", mimoTtsVoice: "Milo" });
    expect(c.model).toBe("mimo-v2.5-tts");
    expect(c.voice).toBe("Milo");
    expect(c.baseURL).toBe("https://api.xiaomimimo.com/v1");
  });
});

describe("buildTtsInstructions", () => {
  it("adds a slow-pace clause only when rate < 1", () => {
    expect(buildTtsInstructions(1)).not.toMatch(/slowly/);
    expect(buildTtsInstructions(0.5)).toContain("50%");
  });
});
