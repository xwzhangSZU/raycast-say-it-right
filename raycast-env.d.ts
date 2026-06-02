/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Defaults: Coach Provider - Initial provider for pronunciation analysis and natural-English expression. You can change provider and model per run from the Action Panel. */
  "defaultAnalysisProvider": "qwen" | "minimax" | "mimo" | "gemini" | "openai",
  /** Defaults: Voice Provider - Initial provider for model audio. Follow Coach Provider uses the coach provider when its voice key is set, otherwise the first configured voice provider. */
  "ttsProvider": "follow-analysis" | "qwen" | "minimax" | "mimo" | "gemini" | "openai",
  /** Qwen Coach: Token Plan API Key - Used only for Qwen coaching, expression, and pronunciation analysis. Qwen Voice uses the separate DashScope key below. */
  "qwenAnalysisApiKey"?: string,
  /** Qwen Coach: Model - Qwen text model used for pronunciation analysis and natural-English expression. */
  "qwenAnalysisModel": "qwen3.6-flash" | "qwen3.6-plus",
  /** Qwen Voice: DashScope API Key - Used only for Qwen voice playback. Qwen Coach uses the Token Plan key above. */
  "qwenApiKey"?: string,
  /** Qwen Voice: DashScope Region - DashScope region for Qwen voice playback. */
  "qwenRegion": "beijing" | "intl",
  /** Qwen Voice: Model - Qwen TTS model used for read-aloud. */
  "qwenTtsModel": "qwen3-tts-flash" | "qwen3-tts-instruct-flash",
  /** Qwen Voice: Voice - Voice for Qwen TTS (all support English). */
  "qwenTtsVoice": "Jennifer" | "Aiden" | "Neil" | "Elias" | "Cherry" | "Katerina" | "Ethan" | "Ryan" | "Nofish",
  /** MiniMax: API Key - Used for both MiniMax Coach and MiniMax Voice. */
  "minimaxApiKey"?: string,
  /** MiniMax Coach: Model - MiniMax text model used for pronunciation analysis and natural-English expression. Voice uses the separate speech model below. */
  "minimaxAnalysisModel": "MiniMax-M3" | "MiniMax-M2.7-highspeed",
  /** MiniMax Voice: Model - MiniMax TTS model used for read-aloud. */
  "minimaxTtsModel": "speech-2.8-hd" | "speech-2.8-turbo",
  /** MiniMax Voice: Voice - Voice ID for MiniMax TTS. */
  "minimaxTtsVoiceId": "English_expressive_narrator" | "English_CaptivatingStoryteller" | "English_Trustworth_Man" | "English_SereneWoman" | "English_WiseScholar",
  /** MiMo: Token Plan API Key - Xiaomi MiMo Token Plan key (tp-...). Used for both MiMo Coach and MiMo Voice. */
  "mimoApiKey"?: string,
  /** MiMo Coach: Model - MiMo text model used for pronunciation analysis and natural-English expression. */
  "mimoAnalysisModel": "mimo-v2.5" | "mimo-v2.5-pro",
  /** MiMo Voice: Voice - Voice for MiMo TTS (English voices). */
  "mimoTtsVoice": "Chloe" | "Mia" | "Milo" | "Dean",
  /** Gemini: API Key - Google AI Studio key for both Gemini Coach and Gemini Voice. */
  "geminiApiKey"?: string,
  /** Gemini Coach: Model - Gemini text model used for pronunciation analysis and natural-English expression. */
  "geminiAnalysisModel": "gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite" | "gemini-3-flash-preview",
  /** Gemini Voice: Voice - Voice for Gemini TTS. */
  "geminiTtsVoice": "Charon" | "Iapetus" | "Sulafat" | "Puck",
  /** OpenAI: API Key - Used for both OpenAI Coach and OpenAI Voice. */
  "openaiApiKey"?: string,
  /** OpenAI Voice: Voice - Voice for OpenAI TTS. */
  "openaiTtsVoice": "marin" | "cedar" | "coral" | "alloy" | "ash" | "ballad" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer" | "verse",
  /** Practice: Translation Target - Target language for Translate Sentence/Page inside the practice view. Standalone Say ... in English commands always target English. */
  "translationTargetLanguage": "auto" | "zh-Hans" | "zh-Hant" | "en" | "ja" | "ko" | "fr" | "de" | "es" | "it" | "pt" | "ru" | "ar" | "hi" | "vi" | "th" | "id" | "tr" | "nl" | "pl",
  /** Practice: Sentences Per Page - How many sentences are shown and analyzed together for long passages. */
  "sentencesPerPage": string,
  /** Practice: Shadowing Loop Count - How many times the Shadowing Loop repeats the sentence. */
  "loopCount": string,
  /** Practice: Shadowing Loop Gap - Pause between repeats in the Shadowing Loop. */
  "loopGap": string,
  /** Advanced: Qwen Coach Base URL - Token Plan base URL for Qwen coaching. The default is Anthropic-compatible; OpenAI-compatible /compatible-mode/v1 is also supported. */
  "qwenAnalysisBaseURL": string,
  /** Advanced: MiniMax Coach Base URL - Anthropic-compatible endpoint for MiniMax coaching and expression. */
  "minimaxBaseURL": string,
  /** Advanced: MiniMax Voice Base URL - MiniMax TTS base URL for model audio. */
  "minimaxTtsBaseURL": string,
  /** Advanced: MiMo Coach Base URL - Anthropic-compatible base URL for MiMo coaching. MiMo Voice uses the matching Token Plan /v1 endpoint because the Anthropic messages endpoint does not return audio. */
  "mimoBaseURL": string
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

