import type { TtsProviderName, RawPrefs } from "../llm/config";

export interface TtsConfig {
  provider: TtsProviderName;
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
  mimoTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen" | "mimo";
  loopCount?: string;
  loopGap?: string;
}
