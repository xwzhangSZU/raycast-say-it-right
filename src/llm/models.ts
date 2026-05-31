export interface ModelOption {
  id: string;
  title: string;
}

export const PROVIDER_IDS = [
  "qwen",
  "minimax",
  "mimo",
  "gemini",
  "openai",
] as const;
export type ProviderName = (typeof PROVIDER_IDS)[number];

export const TTS_PROVIDER_IDS = [
  "qwen",
  "minimax",
  "mimo",
  "gemini",
  "openai",
] as const;
export type TtsProviderName = (typeof TTS_PROVIDER_IDS)[number];

export const DEFAULT_ANALYSIS_PROVIDER: ProviderName = "qwen";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  qwen: "Qwen",
  minimax: "MiniMax",
  mimo: "MiMo",
  gemini: "Gemini",
  openai: "OpenAI",
};

export const DEFAULT_ANALYSIS_MODELS: Record<ProviderName, string> = {
  qwen: "qwen3.6-flash",
  minimax: "MiniMax-M2.7-highspeed",
  mimo: "mimo-v2.5",
  gemini: "gemini-3.5-flash",
  openai: "gpt-5.5",
};

export const ANALYSIS_MODELS: Record<ProviderName, readonly ModelOption[]> = {
  qwen: [
    { id: "qwen3.6-flash", title: "Qwen 3.6 Flash" },
    { id: "qwen3.6-plus", title: "Qwen 3.6 Plus" },
  ],
  minimax: [{ id: "MiniMax-M2.7-highspeed", title: "M2.7 High-Speed" }],
  mimo: [
    { id: "mimo-v2.5", title: "V2.5" },
    { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
  ],
  gemini: [{ id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" }],
  openai: [{ id: "gpt-5.5", title: "GPT-5.5" }],
};

export const DEFAULT_TTS_MODELS: Record<TtsProviderName, string> = {
  qwen: "qwen3-tts-flash",
  minimax: "speech-2.8-turbo",
  mimo: "mimo-v2.5-tts",
  gemini: "gemini-3.1-flash-tts-preview",
  openai: "gpt-4o-mini-tts",
};

export const TTS_MODELS: Record<TtsProviderName, readonly ModelOption[]> = {
  qwen: [
    { id: "qwen3-tts-flash", title: "Qwen3 TTS Flash" },
    { id: "qwen3-tts-instruct-flash", title: "Qwen3 TTS Instruct Flash" },
  ],
  minimax: [
    { id: "speech-2.8-turbo", title: "Speech 2.8 Turbo" },
    { id: "speech-2.8-hd", title: "Speech 2.8 HD" },
  ],
  mimo: [{ id: "mimo-v2.5-tts", title: "MiMo V2.5 TTS" }],
  gemini: [
    {
      id: "gemini-3.1-flash-tts-preview",
      title: "Gemini 3.1 Flash TTS Preview",
    },
  ],
  openai: [{ id: "gpt-4o-mini-tts", title: "GPT-4o Mini TTS" }],
};

export const DEFAULT_TTS_VOICES: Record<TtsProviderName, string> = {
  qwen: "Jennifer",
  minimax: "English_expressive_narrator",
  mimo: "Chloe",
  gemini: "Charon",
  openai: "marin",
};

export const TTS_VOICES: Record<TtsProviderName, readonly string[]> = {
  qwen: [
    "Jennifer",
    "Aiden",
    "Neil",
    "Elias",
    "Cherry",
    "Katerina",
    "Ethan",
    "Ryan",
    "Nofish",
  ],
  minimax: [
    "English_expressive_narrator",
    "English_CaptivatingStoryteller",
    "English_Trustworth_Man",
    "English_SereneWoman",
    "English_WiseScholar",
  ],
  mimo: ["Chloe", "Mia", "Milo", "Dean"],
  gemini: ["Charon", "Iapetus", "Sulafat", "Puck"],
  openai: [
    "marin",
    "cedar",
    "coral",
    "alloy",
    "ash",
    "ballad",
    "echo",
    "fable",
    "nova",
    "onyx",
    "sage",
    "shimmer",
    "verse",
  ],
};

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function isTtsProviderName(value: string): value is TtsProviderName {
  return (TTS_PROVIDER_IDS as readonly string[]).includes(value);
}

export function knownModelOrDefault(
  value: string | undefined,
  options: readonly ModelOption[],
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";
  return options.some((option) => option.id === trimmed) ? trimmed : fallback;
}
