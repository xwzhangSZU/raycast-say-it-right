import type { ChatConfig } from "./client";

export type ProviderName = "openai" | "qwen";

export interface RawPrefs {
  openaiApiKey?: string;
  openaiAnalysisModel?: string;
  qwenApiKey?: string;
  qwenAnalysisModel?: string;
  qwenRegion?: "beijing" | "intl";
}

export const QWEN_BASE = {
  beijing: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  intl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
} as const;

export class MissingKeyError extends Error {
  constructor(public provider: ProviderName) {
    super(`Missing API key for ${provider}`);
  }
}

export function pickInitialProvider(prefs: {
  openaiApiKey?: string;
  qwenApiKey?: string;
  defaultAnalysisProvider?: ProviderName;
}): ProviderName {
  const hasOpenAI = !!prefs.openaiApiKey?.trim();
  const hasQwen = !!prefs.qwenApiKey?.trim();
  if (hasOpenAI && !hasQwen) return "openai";
  if (hasQwen && !hasOpenAI) return "qwen";
  // both filled (or neither) → honor the preferred provider, default openai
  return prefs.defaultAnalysisProvider ?? "openai";
}

export function resolveAnalysisConfig(
  provider: ProviderName,
  prefs: RawPrefs,
): ChatConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return {
      baseURL: "https://api.openai.com/v1",
      apiKey: prefs.openaiApiKey,
      model: prefs.openaiAnalysisModel || "gpt-4o-mini",
    };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  return {
    baseURL: QWEN_BASE[region],
    apiKey: prefs.qwenApiKey,
    model: prefs.qwenAnalysisModel || "qwen-flash",
  };
}
