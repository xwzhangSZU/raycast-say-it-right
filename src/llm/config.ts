import type { ChatConfig } from "./client";

/** Providers that can analyze text. */
export type ProviderName = "openai" | "qwen" | "gemini" | "mimo";
/** Providers that can synthesize speech (TTS). Gemini has no TTS here. */
export type TtsProviderName = "openai" | "qwen" | "mimo";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: "OpenAI",
  qwen: "Qwen",
  gemini: "Gemini",
  mimo: "MiMo",
};

export interface RawPrefs {
  openaiApiKey?: string;
  openaiAnalysisModel?: string;
  qwenApiKey?: string;
  qwenAnalysisModel?: string;
  qwenRegion?: "beijing" | "intl";
  // Qwen analysis can target a separate endpoint/key (e.g. Alibaba Token Plan);
  // TTS always stays on the standard DashScope API with qwenApiKey.
  qwenAnalysisBaseURL?: string;
  qwenAnalysisApiKey?: string;
  geminiApiKey?: string;
  geminiAnalysisModel?: string;
  mimoApiKey?: string;
  mimoAnalysisModel?: string;
  mimoBaseURL?: string;
}

export const QWEN_BASE = {
  beijing: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  intl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
} as const;

/** Gemini's OpenAI-compatible endpoint. No trailing slash — the client
 * appends `/chat/completions`. */
export const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/** MiMo (Xiaomi) default OpenAI-compatible base. Token-Plan users override this
 * with their cluster URL (token-plan-{cn,sgp,ams}.xiaomimimo.com/v1). */
export const MIMO_BASE = "https://api.xiaomimimo.com/v1";

export class MissingKeyError extends Error {
  constructor(public provider: ProviderName) {
    super(`Missing API key for ${provider}`);
  }
}

export function pickInitialProvider(prefs: {
  openaiApiKey?: string;
  qwenApiKey?: string;
  qwenAnalysisApiKey?: string;
  geminiApiKey?: string;
  mimoApiKey?: string;
  defaultAnalysisProvider?: ProviderName;
}): ProviderName {
  const available: ProviderName[] = [];
  if (prefs.openaiApiKey?.trim()) available.push("openai");
  if (prefs.qwenApiKey?.trim() || prefs.qwenAnalysisApiKey?.trim())
    available.push("qwen");
  if (prefs.geminiApiKey?.trim()) available.push("gemini");
  if (prefs.mimoApiKey?.trim()) available.push("mimo");
  if (available.length === 1) return available[0];
  // Several (or none) configured → honor the preferred provider, else default.
  const preferred = prefs.defaultAnalysisProvider;
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? preferred ?? "openai";
}

export function resolveAnalysisConfig(
  provider: ProviderName,
  prefs: RawPrefs,
): ChatConfig {
  if (provider === "openai") {
    const key = prefs.openaiApiKey?.trim();
    if (!key) throw new MissingKeyError("openai");
    return {
      baseURL: "https://api.openai.com/v1",
      apiKey: key,
      model: prefs.openaiAnalysisModel || "gpt-4o-mini",
    };
  }
  if (provider === "gemini") {
    const key = prefs.geminiApiKey?.trim();
    if (!key) throw new MissingKeyError("gemini");
    return {
      baseURL: GEMINI_BASE,
      apiKey: key,
      model: prefs.geminiAnalysisModel || "gemini-3.5-flash",
    };
  }
  if (provider === "mimo") {
    const key = prefs.mimoApiKey?.trim();
    if (!key) throw new MissingKeyError("mimo");
    return {
      baseURL: prefs.mimoBaseURL?.trim() || MIMO_BASE,
      apiKey: key,
      model: prefs.mimoAnalysisModel || "mimo-v2.5",
      authHeader: "api-key", // MiMo authenticates via `api-key`, not Bearer
      // MiMo-V2.5 uses a Qwen3-style reasoning parser; disable thinking for
      // fast, deterministic structured output (mirrors Qwen here).
      extraBody: { enable_thinking: false },
    };
  }
  // Qwen: analysis may use a separate endpoint + key (e.g. Token Plan);
  // falls back to the standard DashScope endpoint + qwenApiKey.
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  const analysisKey =
    prefs.qwenAnalysisApiKey?.trim() || prefs.qwenApiKey?.trim();
  if (!analysisKey) throw new MissingKeyError("qwen");
  return {
    baseURL: prefs.qwenAnalysisBaseURL?.trim() || QWEN_BASE[region],
    apiKey: analysisKey,
    model: prefs.qwenAnalysisModel || "qwen3.6-flash",
    extraBody: { enable_thinking: false },
  };
}
