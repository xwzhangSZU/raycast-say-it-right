import { describe, it, expect } from "vitest";
import { renderAnalysis } from "../../src/render/markdown";
import { EXAMPLE } from "../../src/__fixtures__/analysis";

describe("renderAnalysis", () => {
  const md = renderAnalysis(EXAMPLE);

  it("uppercases the stressed syllable of content words", () => {
    expect(md).toContain("FIN·ish");
    expect(md).toContain("EAR·ly");
    expect(md).toContain("GIVE");
    expect(md).toContain("CALL");
  });
  it("lowercases function words inside the intonation block", () => {
    const intoBlock = md.split("```")[1]; // content of the first fenced block
    expect(intoBlock).toContain("if");
    expect(intoBlock).toContain("you");
  });
  it("attaches tone arrows to the nuclear (stressed) word", () => {
    const intoBlock = md.split("```")[1];
    expect(intoBlock).toContain("● ↗"); // rising nuclear (early)
    expect(intoBlock).toContain("● ↘"); // falling nuclear (call)
  });
  it("marks the thought-group boundary and IPA and linking", () => {
    expect(md).toContain("‖");
    expect(md).toContain(EXAMPLE.ipa);
    expect(md).toContain("finish‿early");
  });
  it("keeps mark line and word line in each code block on adjacent lines", () => {
    const blocks = md.split("```").filter((_, i) => i % 2 === 1);
    expect(blocks.length).toBe(2); // intonation + rhythm
    for (const b of blocks) {
      const rows = b.trim().split("\n");
      expect(rows.length).toBe(2);
    }
  });
  it("renders the example-sentence subtitle for single-word input", () => {
    const wordExample = {
      ...EXAMPLE,
      isGeneratedExample: true,
      sourceWord: "call",
    };
    const out = renderAnalysis(wordExample);
    expect(out).toContain("Example sentence for");
    expect(out).toContain("**call**");
  });
});
