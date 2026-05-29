import { describe, it, expect } from "vitest";
import { analysisCacheKey } from "../../src/lib/cache-key";

describe("analysisCacheKey", () => {
  it("is stable for identical inputs and varies by provider/accent", () => {
    const a = analysisCacheKey("hello", "openai", "GA");
    const b = analysisCacheKey("hello", "openai", "GA");
    const c = analysisCacheKey("hello", "qwen", "GA");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
