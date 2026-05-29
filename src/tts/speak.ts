import type { ProviderName } from "../llm/config";
import type { TtsPrefs } from "./types";
import {
  resolveTtsProvider,
  resolveTtsConfig,
  buildTtsInstructions,
} from "./index";
import { synthesizeOpenAI } from "./openai";
import { synthesizeQwen } from "./qwen";
import {
  audioCacheKey,
  cachedAudioPath,
  writeAudioCache,
  playAudio,
} from "./playback";

let lastPlayedPath: string | null = null;

export async function speak(
  text: string,
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
  slow: boolean,
): Promise<void> {
  const provider = resolveTtsProvider(analysisProvider, prefs);
  const cfg = resolveTtsConfig(provider, prefs);
  // `slow` selects between two cached audio slots (normal vs teaching-slow);
  // the numeric slowRate is baked into the synthesis instructions, not the key.
  const key = audioCacheKey({ text, provider, voice: cfg.voice, slow });

  let path = cachedAudioPath(key, "wav");
  if (!path) {
    const opts = {
      slow,
      instructions: buildTtsInstructions(slow, prefs.slowRate || "0.6"),
    };
    const result =
      provider === "openai"
        ? await synthesizeOpenAI(text, opts, cfg)
        : await synthesizeQwen(text, opts, cfg);
    path = await writeAudioCache(key, result.ext, result.bytes);
  }
  lastPlayedPath = path;
  await playAudio(path);
}

export async function repeatLast(): Promise<boolean> {
  if (!lastPlayedPath) return false;
  await playAudio(lastPlayedPath);
  return true;
}
