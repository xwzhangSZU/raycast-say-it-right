import { describe, it, expect } from "vitest";
import { ProsodyAnalysisSchema } from "../src/types";
import { EXAMPLE } from "../src/__fixtures__/analysis";

describe("ProsodyAnalysisSchema", () => {
  it("accepts the canonical example", () => {
    expect(() => ProsodyAnalysisSchema.parse(EXAMPLE)).not.toThrow();
  });
  it("rejects a word missing required fields", () => {
    const bad = { ...EXAMPLE, thoughtGroups: [{ tone: "rise", words: [{ text: "x" }] }] };
    expect(() => ProsodyAnalysisSchema.parse(bad)).toThrow();
  });
  it("rejects an invalid tone", () => {
    const bad = { ...EXAMPLE, thoughtGroups: [{ ...EXAMPLE.thoughtGroups[0], tone: "wobble" }] };
    expect(() => ProsodyAnalysisSchema.parse(bad)).toThrow();
  });
});
