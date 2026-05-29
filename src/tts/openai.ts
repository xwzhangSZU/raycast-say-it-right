import type { TtsConfig, SynthesizeOptions } from "./types";

export class TtsError extends Error {}

export interface SynthResult {
  bytes: Buffer;
  ext: string;
}

export async function synthesizeOpenAI(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const res = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      voice: cfg.voice,
      input: text,
      instructions: opts.instructions,
      response_format: "wav",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`OpenAI TTS ${res.status}: ${body.slice(0, 150)}`);
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), ext: "wav" };
}
