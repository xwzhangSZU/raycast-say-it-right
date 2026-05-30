import { describe, it, expect } from "vitest";
import {
  resolveAnalysisConfig,
  MissingKeyError,
  QWEN_BASE,
  GEMINI_BASE,
  MIMO_BASE,
  pickInitialProvider,
} from "../../src/llm/config";

describe("resolveAnalysisConfig", () => {
  it("builds OpenAI config", () => {
    const c = resolveAnalysisConfig("openai", {
      openaiApiKey: "sk",
      openaiAnalysisModel: "gpt-x",
    });
    expect(c.baseURL).toBe("https://api.openai.com/v1");
    expect(c.model).toBe("gpt-x");
  });
  it("builds Qwen config with region-specific base URL", () => {
    const c = resolveAnalysisConfig("qwen", {
      qwenApiKey: "sk",
      qwenRegion: "intl",
    });
    expect(c.baseURL).toBe(QWEN_BASE.intl);
    expect(c.model).toBe("qwen3.6-flash");
  });
  it("Qwen analysis can target a separate Token Plan endpoint + key", () => {
    const c = resolveAnalysisConfig("qwen", {
      qwenApiKey: "sk-regular",
      qwenAnalysisApiKey: "sk-sp-placeholder",
      qwenAnalysisBaseURL:
        "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    });
    expect(c.baseURL).toBe(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    );
    expect(c.apiKey).toBe("sk-sp-placeholder");
    expect(c.extraBody).toEqual({ enable_thinking: false });
  });
  it("Qwen analysis falls back to the main key/endpoint without an override", () => {
    const c = resolveAnalysisConfig("qwen", { qwenApiKey: "sk-regular" });
    expect(c.apiKey).toBe("sk-regular");
    expect(c.baseURL).toBe(QWEN_BASE.beijing);
  });
  it("sets enable_thinking:false in Qwen extraBody and no extraBody for OpenAI", () => {
    const qwen = resolveAnalysisConfig("qwen", { qwenApiKey: "sk" });
    expect(qwen.extraBody).toEqual({ enable_thinking: false });
    const openai = resolveAnalysisConfig("openai", { openaiApiKey: "sk" });
    expect(openai.extraBody).toBeUndefined();
  });
  it("builds Gemini config on its OpenAI-compatible endpoint", () => {
    const c = resolveAnalysisConfig("gemini", { geminiApiKey: "sk" });
    expect(c.baseURL).toBe(GEMINI_BASE);
    expect(c.baseURL.endsWith("/")).toBe(false); // client appends /chat/completions
    expect(c.model).toBe("gemini-3.5-flash");
    const override = resolveAnalysisConfig("gemini", {
      geminiApiKey: "sk",
      geminiAnalysisModel: "gemini-3.1-pro-preview",
    });
    expect(override.model).toBe("gemini-3.1-pro-preview");
  });
  it("builds MiMo config: api-key auth, default mimo-v2.5, thinking off, overridable base URL", () => {
    const c = resolveAnalysisConfig("mimo", { mimoApiKey: "tp-x" });
    expect(c.baseURL).toBe(MIMO_BASE);
    expect(c.model).toBe("mimo-v2.5");
    expect(c.authHeader).toBe("api-key");
    expect(c.extraBody).toEqual({ enable_thinking: false });
    const pro = resolveAnalysisConfig("mimo", {
      mimoApiKey: "tp-x",
      mimoAnalysisModel: "mimo-v2.5-pro",
      mimoBaseURL: "https://token-plan-cn.xiaomimimo.com/v1",
    });
    expect(pro.model).toBe("mimo-v2.5-pro");
    expect(pro.baseURL).toBe("https://token-plan-cn.xiaomimimo.com/v1");
  });
  it("throws MissingKeyError when key absent", () => {
    expect(() => resolveAnalysisConfig("openai", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("gemini", {})).toThrow(MissingKeyError);
    expect(() => resolveAnalysisConfig("mimo", {})).toThrow(MissingKeyError);
  });
});

describe("pickInitialProvider", () => {
  it("uses the only provider whose key is set", () => {
    expect(pickInitialProvider({ openaiApiKey: "sk" })).toBe("openai");
    expect(pickInitialProvider({ qwenApiKey: "sk" })).toBe("qwen");
  });
  it("falls back to the preferred provider when both keys are set", () => {
    expect(pickInitialProvider({ openaiApiKey: "a", qwenApiKey: "b", defaultAnalysisProvider: "qwen" })).toBe("qwen");
    expect(pickInitialProvider({ openaiApiKey: "a", qwenApiKey: "b" })).toBe("openai");
  });
  it("ignores blank/whitespace keys", () => {
    expect(pickInitialProvider({ openaiApiKey: "  ", qwenApiKey: "sk" })).toBe("qwen");
  });
  it("supports gemini as the sole or preferred provider", () => {
    expect(pickInitialProvider({ geminiApiKey: "sk" })).toBe("gemini");
    expect(
      pickInitialProvider({
        openaiApiKey: "a",
        qwenApiKey: "b",
        geminiApiKey: "c",
        defaultAnalysisProvider: "gemini",
      }),
    ).toBe("gemini");
  });
  it("supports mimo as the sole or preferred provider", () => {
    expect(pickInitialProvider({ mimoApiKey: "tp" })).toBe("mimo");
    expect(
      pickInitialProvider({
        openaiApiKey: "a",
        mimoApiKey: "tp",
        defaultAnalysisProvider: "mimo",
      }),
    ).toBe("mimo");
  });
});
