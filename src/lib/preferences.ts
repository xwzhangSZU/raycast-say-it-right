import { getPreferenceValues } from "@raycast/api";
import type { ProviderName, RawPrefs } from "../llm/config";

export interface Prefs extends RawPrefs {
  defaultAnalysisProvider: ProviderName;
  openaiTtsVoice?: string;
  qwenTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen";
  loopCount?: string;
  loopGap?: string;
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}
