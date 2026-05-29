import type { ProviderName } from "../llm/config";
import { MissingKeyError, QWEN_BASE } from "../llm/config";
import type { TtsConfig, TtsPrefs } from "./types";

export function resolveTtsProvider(analysisProvider: ProviderName, prefs: TtsPrefs): ProviderName {
  const choice = prefs.ttsProvider || "follow-analysis";
  return choice === "follow-analysis" ? analysisProvider : choice;
}

export function resolveTtsConfig(provider: ProviderName, prefs: TtsPrefs): TtsConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return {
      provider,
      apiKey: prefs.openaiApiKey,
      voice: prefs.openaiTtsVoice || "alloy",
      model: "gpt-4o-mini-tts",
    };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  const base = QWEN_BASE[region].replace("/compatible-mode/v1", "/api/v1");
  return {
    provider,
    apiKey: prefs.qwenApiKey,
    voice: prefs.qwenTtsVoice || "Cherry",
    model: "qwen3-tts-flash",
    baseURL: base,
  };
}

export function buildTtsInstructions(slow: boolean, slowRate: string): string {
  const base =
    "Read this English sentence as a clear pronunciation model with a General American accent. Emphasize the stressed words, use natural rising and falling intonation, and pause briefly at commas.";
  if (!slow) return base;
  const rate = Number(slowRate) || 0.6;
  const pct = Math.round(rate * 100);
  return `${base} Speak slowly and deliberately, at about ${pct}% of normal speed, as a teaching example.`;
}
