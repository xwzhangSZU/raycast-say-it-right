import type { ProviderName, TtsProviderName } from "../llm/config";
import { MissingKeyError, MIMO_BASE } from "../llm/config";
import {
  DEFAULT_TTS_MODELS,
  DEFAULT_TTS_VOICES,
  TTS_MODELS,
  TTS_PROVIDER_IDS,
  knownModelOrDefault,
} from "../llm/models";
import type { TtsConfig, TtsPrefs } from "./types";

export const GEMINI_TTS_BASE =
  "https://generativelanguage.googleapis.com/v1beta";
export const MINIMAX_TTS_BASE = "https://api.minimaxi.com/v1";
export const QWEN_TTS_BASE = {
  beijing: "https://dashscope.aliyuncs.com/api/v1",
  intl: "https://dashscope-intl.aliyuncs.com/api/v1",
} as const;

export function resolveTtsProvider(
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
): TtsProviderName {
  const choice = prefs.ttsProvider || "follow-analysis";
  if (choice !== "follow-analysis") return choice;
  if ((TTS_PROVIDER_IDS as readonly string[]).includes(analysisProvider))
    return analysisProvider;
  if (prefs.qwenApiKey?.trim()) return "qwen";
  if (prefs.minimaxApiKey?.trim()) return "minimax";
  if (prefs.mimoApiKey?.trim()) return "mimo";
  if (prefs.geminiApiKey?.trim()) return "gemini";
  if (prefs.openaiApiKey?.trim()) return "openai";
  return "qwen"; // none set → resolveTtsConfig throws a clear MissingKeyError
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
      voice: prefs.openaiTtsVoice || DEFAULT_TTS_VOICES.openai,
      model: knownModelOrDefault(
        prefs.openaiTtsModel,
        TTS_MODELS.openai,
        DEFAULT_TTS_MODELS.openai,
      ),
    };
  }
  if (provider === "gemini") {
    if (!prefs.geminiApiKey) throw new MissingKeyError("gemini");
    return {
      provider,
      apiKey: prefs.geminiApiKey,
      voice: prefs.geminiTtsVoice || DEFAULT_TTS_VOICES.gemini,
      model: knownModelOrDefault(
        prefs.geminiTtsModel,
        TTS_MODELS.gemini,
        DEFAULT_TTS_MODELS.gemini,
      ),
      baseURL: GEMINI_TTS_BASE,
    };
  }
  if (provider === "minimax") {
    if (!prefs.minimaxApiKey) throw new MissingKeyError("minimax");
    return {
      provider,
      apiKey: prefs.minimaxApiKey,
      voice: prefs.minimaxTtsVoiceId || DEFAULT_TTS_VOICES.minimax,
      model: knownModelOrDefault(
        prefs.minimaxTtsModel,
        TTS_MODELS.minimax,
        DEFAULT_TTS_MODELS.minimax,
      ),
      baseURL: prefs.minimaxTtsBaseURL?.trim() || MINIMAX_TTS_BASE,
    };
  }
  if (provider === "mimo") {
    if (!prefs.mimoApiKey) throw new MissingKeyError("mimo");
    return {
      provider,
      apiKey: prefs.mimoApiKey,
      voice: prefs.mimoTtsVoice || DEFAULT_TTS_VOICES.mimo,
      model: knownModelOrDefault(
        prefs.mimoTtsModel,
        TTS_MODELS.mimo,
        DEFAULT_TTS_MODELS.mimo,
      ),
      baseURL: mimoTtsBaseURL(prefs.mimoBaseURL?.trim() || MIMO_BASE),
    };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  const base = QWEN_TTS_BASE[region];
  return {
    provider,
    apiKey: prefs.qwenApiKey,
    voice: prefs.qwenTtsVoice || DEFAULT_TTS_VOICES.qwen,
    model: knownModelOrDefault(
      prefs.qwenTtsModel,
      TTS_MODELS.qwen,
      DEFAULT_TTS_MODELS.qwen,
    ),
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

export function mimoTtsBaseURL(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  const lower = trimmed.toLowerCase();
  if (lower.endsWith("/anthropic/v1/messages")) {
    return `${trimmed.slice(0, -"/anthropic/v1/messages".length)}/v1`;
  }
  if (lower.endsWith("/anthropic/v1")) {
    return `${trimmed.slice(0, -"/anthropic/v1".length)}/v1`;
  }
  if (lower.endsWith("/anthropic")) {
    return `${trimmed.slice(0, -"/anthropic".length)}/v1`;
  }
  return trimmed;
}
