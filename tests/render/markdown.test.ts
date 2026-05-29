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
  it("lowercases function words", () => {
    expect(md).toMatch(/\bif\b/);
    expect(md).toMatch(/\byou\b/);
  });
  it("shows the rising tone on the first group and falling on the second", () => {
    expect(md).toContain("↗");
    expect(md).toContain("↘");
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
});
