import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

export async function synthesizeQwen(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base = cfg.baseURL ?? "https://dashscope.aliyuncs.com/api/v1";
  const model = opts.slow ? "qwen3-tts-instruct-flash" : cfg.model;
  const body: Record<string, unknown> = {
    model,
    input: { text, voice: cfg.voice, language_type: "English" },
  };
  if (opts.slow) body.parameters = { instructions: opts.instructions };

  const res = await fetchImpl(
    `${base}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new TtsError(`Qwen TTS ${res.status}: ${errBody.slice(0, 150)}`);
  }
  const data = (await res.json()) as {
    output?: { audio?: { url?: string; data?: string } };
  };
  const audio = data?.output?.audio;
  if (audio?.data)
    return { bytes: Buffer.from(audio.data, "base64"), ext: "wav" };
  if (audio?.url) {
    const a = await fetchImpl(audio.url);
    return { bytes: Buffer.from(await a.arrayBuffer()), ext: "wav" };
  }
  throw new TtsError("Qwen TTS: no audio in response");
}
