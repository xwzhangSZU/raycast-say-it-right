import { describe, it, expect } from "vitest";
import { splitSentences } from "../../src/lib/sentences";

describe("splitSentences", () => {
  it("splits on sentence boundaries", () => {
    expect(splitSentences("Hello world. How are you? Fine!")).toEqual(["Hello world.", "How are you?", "Fine!"]);
  });
  it("returns a single-element array for one sentence", () => {
    expect(splitSentences("Just one sentence")).toEqual(["Just one sentence"]);
  });
  it("returns empty for blank input", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
});
