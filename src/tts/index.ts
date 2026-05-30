import type { ProviderName, TtsProviderName } from "../llm/config";
import { MissingKeyError, QWEN_BASE, MIMO_BASE } from "../llm/config";
import type { TtsConfig, TtsPrefs } from "./types";

export function resolveTtsProvider(
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
): TtsProviderName {
  const choice = prefs.ttsProvider || "follow-analysis";
  if (choice !== "follow-analysis") return choice; // explicit openai|qwen|mimo
  // "follow-analysis": every analysis provider except gemini can also speak.
  if (analysisProvider !== "gemini") return analysisProvider;
  // gemini has no TTS here → fall back to whichever TTS key is set.
  if (prefs.openaiApiKey?.trim()) return "openai";
  if (prefs.qwenApiKey?.trim()) return "qwen";
  if (prefs.mimoApiKey?.trim()) return "mimo";
  return "openai"; // none set → resolveTtsConfig throws a clear MissingKeyError
}

export function resolveTtsConfig(
  provider: TtsProviderName,
  prefs: TtsPrefs,
): TtsConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return {
      provider,
      apiKey: prefs.openaiApiKey,
      voice: prefs.openaiTtsVoice || "alloy",
      model: "gpt-4o-mini-tts",
    };
  }
  if (provider === "mimo") {
    if (!prefs.mimoApiKey) throw new MissingKeyError("mimo");
    return {
      provider,
      apiKey: prefs.mimoApiKey,
      voice: prefs.mimoTtsVoice || "Chloe",
      model: "mimo-v2.5-tts",
      baseURL: prefs.mimoBaseURL?.trim() || MIMO_BASE,
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

export function buildTtsInstructions(rate: number): string {
  const base =
    "Read this English sentence as a clear pronunciation model with a General American accent. Emphasize the stressed words, use natural rising and falling intonation, and pause briefly at commas.";
  if (rate >= 1) return base;
  const pct = Math.round(rate * 100);
  return `${base} Speak slowly and deliberately, at about ${pct}% of normal speed, as a teaching example.`;
}
