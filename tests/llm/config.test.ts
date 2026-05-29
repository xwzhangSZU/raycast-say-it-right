import { describe, it, expect } from "vitest";
import {
  resolveAnalysisConfig,
  MissingKeyError,
  QWEN_BASE,
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
    expect(c.model).toBe("qwen-flash");
  });
  it("throws MissingKeyError when key absent", () => {
    expect(() => resolveAnalysisConfig("openai", {})).toThrow(MissingKeyError);
  });
});
