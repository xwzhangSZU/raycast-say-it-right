import { describe, it, expect } from "vitest";
import { buildPrompt, parseAnalysis } from "../../src/llm/prompt";
import { EXAMPLE } from "../../src/__fixtures__/analysis";

describe("buildPrompt", () => {
  it("asks to generate an example for single-word input", () => {
    const { user } = buildPrompt("serendipity", { isWord: true, accent: "GA" });
    expect(user).toContain("single word");
    expect(user).toContain("serendipity");
  });
  it("analyzes phrase input as-is", () => {
    const { user } = buildPrompt("give me a call", { isWord: false, accent: "GA" });
    expect(user).toContain("Analyze this text");
  });
});

describe("parseAnalysis", () => {
  it("parses clean JSON", () => {
    const out = parseAnalysis(JSON.stringify(EXAMPLE));
    expect(out.text).toBe(EXAMPLE.text);
  });
  it("strips markdown code fences", () => {
    const out = parseAnalysis("```json\n" + JSON.stringify(EXAMPLE) + "\n```");
    expect(out.thoughtGroups.length).toBe(2);
  });
  it("throws on schema-invalid JSON", () => {
    expect(() => parseAnalysis(JSON.stringify({ text: "x" }))).toThrow();
  });
});
