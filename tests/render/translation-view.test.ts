import { describe, expect, it } from "vitest";
import { renderTranslationMarkdown } from "../../src/render/translation";

describe("renderTranslationMarkdown", () => {
  it("renders source and translation", () => {
    const out = renderTranslationMarkdown("Could you turn it off?", {
      translation: "请把它关掉好吗？",
      targetLanguageTitle: "Chinese Simplified",
    });

    expect(out).toContain("# Translation");
    expect(out).toContain("> Could you turn it off?");
    expect(out).toContain("## Chinese Simplified");
    expect(out).toContain("请把它关掉好吗？");
  });

  it("shows failed state without losing the source", () => {
    const out = renderTranslationMarkdown("hello", { failed: true });

    expect(out).toContain("> hello");
    expect(out).toContain("Could not translate");
  });
});
