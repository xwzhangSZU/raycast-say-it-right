import { describe, it, expect } from "vitest";
import {
  resolveAnalysisConfig,
  MissingKeyError,
  QWEN_BASE,
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
  it("sets enable_thinking:false in Qwen extraBody and no extraBody for OpenAI", () => {
    const qwen = resolveAnalysisConfig("qwen", { qwenApiKey: "sk" });
    expect(qwen.extraBody).toEqual({ enable_thinking: false });
    const openai = resolveAnalysisConfig("openai", { openaiApiKey: "sk" });
    expect(openai.extraBody).toBeUndefined();
  });
  it("throws MissingKeyError when key absent", () => {
    expect(() => resolveAnalysisConfig("openai", {})).toThrow(MissingKeyError);
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
});
