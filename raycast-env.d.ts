/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Analysis Provider - Initial provider for analysis and translation. You can change provider and model per run from the Action Panel. */
  "defaultAnalysisProvider": "qwen" | "minimax" | "mimo" | "gemini" | "openai",
  /** Default TTS Provider - Initial provider for model audio. Follow Analysis Provider uses the analysis provider when its TTS key is set, otherwise the first configured TTS provider. */
  "ttsProvider": "follow-analysis" | "qwen" | "minimax" | "mimo" | "gemini" | "openai",
  /** OpenAI API Key - Used for OpenAI analysis and TTS. */
  "openaiApiKey"?: string,
  /** OpenAI TTS Voice - Voice for OpenAI TTS. */
  "openaiTtsVoice": "marin" | "cedar" | "coral" | "alloy" | "ash" | "ballad" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer" | "verse",
  /** DashScope API Key - Used only for Qwen-TTS. Qwen analysis uses the Token Plan key below. */
  "qwenApiKey"?: string,
  /** Qwen-TTS Region - DashScope TTS region (affects Qwen-TTS base URL). */
  "qwenRegion": "beijing" | "intl",
  /** Qwen Analysis Model - Qwen chat model used for analysis. */
  "qwenAnalysisModel": "qwen3.6-flash" | "qwen3.6-plus",
  /** Qwen Analysis Base URL - Qwen Token Plan base URL for analysis. Default is Anthropic-compatible; OpenAI-compatible /compatible-mode/v1 is also supported. TTS uses DashScope separately. */
  "qwenAnalysisBaseURL": string,
  /** Qwen Token Plan API Key - Used only for Qwen analysis. Does not affect Qwen-TTS. */
  "qwenAnalysisApiKey"?: string,
  /** Qwen TTS Model - Qwen TTS model used for read-aloud. */
  "qwenTtsModel": "qwen3-tts-flash" | "qwen3-tts-instruct-flash",
  /** Qwen TTS Voice - Voice for Qwen TTS (all support English). */
  "qwenTtsVoice": "Jennifer" | "Aiden" | "Neil" | "Elias" | "Cherry" | "Katerina" | "Ethan" | "Ryan" | "Nofish",
  /** MiniMax API Key - Used for MiniMax analysis and TTS. */
  "minimaxApiKey"?: string,
  /** MiniMax Analysis Base URL - MiniMax Token Plan Anthropic-compatible endpoint (ANTHROPIC_BASE_URL). */
  "minimaxBaseURL": string,
  /** MiniMax TTS Base URL - MiniMax TTS base URL. */
  "minimaxTtsBaseURL": string,
  /** MiniMax TTS Model - MiniMax TTS model used for read-aloud. */
  "minimaxTtsModel": "speech-2.8-turbo" | "speech-2.8-hd",
  /** MiniMax TTS Voice - Voice ID for MiniMax TTS. */
  "minimaxTtsVoiceId": "English_expressive_narrator" | "English_CaptivatingStoryteller" | "English_Trustworth_Man" | "English_SereneWoman" | "English_WiseScholar",
  /** Gemini API Key - Google AI Studio key for Gemini analysis and TTS. */
  "geminiApiKey"?: string,
  /** Gemini TTS Voice - Voice for Gemini TTS. */
  "geminiTtsVoice": "Charon" | "Iapetus" | "Sulafat" | "Puck",
  /** MiMo (Xiaomi) API Key - Xiaomi MiMo Token Plan key (tp-…). Used for MiMo analysis and TTS. */
  "mimoApiKey"?: string,
  /** MiMo Base URL - MiMo Token Plan Anthropic-compatible base URL for text generation. TTS uses the matching Token Plan /v1 endpoint because the Anthropic messages endpoint does not return audio. */
  "mimoBaseURL": string,
  /** MiMo Analysis Model - MiMo chat model for analysis (thinking is disabled for speed/determinism). */
  "mimoAnalysisModel": "mimo-v2.5" | "mimo-v2.5-pro",
  /** MiMo TTS Voice - Voice for MiMo TTS (English voices). */
  "mimoTtsVoice": "Chloe" | "Mia" | "Milo" | "Dean",
  /** Translation Target - Target language for Translate actions. Auto translates Chinese to English and other text to Simplified Chinese. */
  "translationTargetLanguage": "auto" | "zh-Hans" | "zh-Hant" | "en" | "ja" | "ko" | "fr" | "de" | "es" | "it" | "pt" | "ru" | "ar" | "hi" | "vi" | "th" | "id" | "tr" | "nl" | "pl",
  /** Sentences Per Page - How many sentences are shown and analyzed together for long passages. */
  "sentencesPerPage": string,
  /** Shadowing Loop Count - How many times the Shadowing Loop repeats the sentence. */
  "loopCount": string,
  /** Shadowing Loop Gap (seconds) - Pause between repeats in the Shadowing Loop. */
  "loopGap": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `analyze-selection` command */
  export type AnalyzeSelection = ExtensionPreferences & {}
  /** Preferences accessible in the `practice-sentence` command */
  export type PracticeSentence = ExtensionPreferences & {}
  /** Preferences accessible in the `translate-selection` command */
  export type TranslateSelection = ExtensionPreferences & {}
  /** Preferences accessible in the `translate-clipboard` command */
  export type TranslateClipboard = ExtensionPreferences & {}
  /** Preferences accessible in the `translate-intent` command */
  export type TranslateIntent = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `analyze-selection` command */
  export type AnalyzeSelection = {}
  /** Arguments passed to the `practice-sentence` command */
  export type PracticeSentence = {}
  /** Arguments passed to the `translate-selection` command */
  export type TranslateSelection = {}
  /** Arguments passed to the `translate-clipboard` command */
  export type TranslateClipboard = {}
  /** Arguments passed to the `translate-intent` command */
  export type TranslateIntent = {}
}

