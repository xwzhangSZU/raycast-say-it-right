import type { ProviderName, RawPrefs } from "../llm/config";

export interface TtsConfig {
  provider: ProviderName;
  apiKey: string;
  voice: string;
  model: string;
  baseURL?: string;
}

export interface SynthesizeOptions {
  rate: number; // 1.0 = normal speed; < 1 = slower teaching pace
  instructions: string;
}

export interface TtsPrefs extends RawPrefs {
  openaiTtsVoice?: string;
  qwenTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen";
  loopCount?: string;
  loopGap?: string;
}
