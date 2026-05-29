import { describe, it, expect, vi } from "vitest";
import { audioCacheKey, playAudio } from "../../src/tts/playback";

describe("audioCacheKey", () => {
  it("is deterministic and sensitive to slow flag", () => {
    const a = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      slow: false,
    });
    const b = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      slow: false,
    });
    const c = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      slow: true,
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("playAudio", () => {
  it("invokes afplay with the file path", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await playAudio("/tmp/x.wav", exec as never);
    expect(exec).toHaveBeenCalledWith("afplay", ["/tmp/x.wav"]);
  });
});
