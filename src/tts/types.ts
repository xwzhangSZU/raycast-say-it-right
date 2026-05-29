import type { ProviderName, RawPrefs } from "../llm/config";

export interface TtsConfig {
  provider: ProviderName;
  apiKey: string;
  voice: string;
  model: string;
  baseURL?: string; // qwen only
}

export interface SynthesizeOptions {
  slow: boolean;
  instructions: string;
}

export interface TtsPrefs extends RawPrefs {
  openaiTtsVoice?: string;
  qwenTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen";
  slowRate?: string;
}
