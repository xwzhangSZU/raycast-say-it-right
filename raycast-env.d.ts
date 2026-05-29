/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Analysis Provider - Preferred provider when BOTH API keys are set. If only one key is filled, that provider is used automatically. */
  "defaultAnalysisProvider": "openai" | "qwen",
  /** OpenAI API Key - Used for OpenAI analysis and TTS. */
  "openaiApiKey"?: string,
  /** OpenAI Analysis Model - Chat model for analysis. */
  "openaiAnalysisModel": string,
  /** OpenAI TTS Voice - Voice for OpenAI TTS. */
  "openaiTtsVoice": "alloy" | "ash" | "coral" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer",
  /** Qwen (DashScope) API Key - Used for Qwen analysis and TTS. */
  "qwenApiKey"?: string,
  /** Qwen Region - DashScope region (affects base URL). */
  "qwenRegion": "beijing" | "intl",
  /** Qwen Analysis Model - Qwen chat model used for analysis. */
  "qwenAnalysisModel": "qwen3.6-flash" | "qwen3.6-plus" | "qwen3.7-max",
  /** Qwen TTS Voice - Voice for Qwen TTS (all support English). */
  "qwenTtsVoice": "Cherry" | "Jennifer" | "Katerina" | "Ethan" | "Ryan" | "Elias" | "Nofish",
  /** TTS Provider - Which provider synthesizes audio. */
  "ttsProvider": "follow-analysis" | "openai" | "qwen",
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
}

declare namespace Arguments {
  /** Arguments passed to the `analyze-selection` command */
  export type AnalyzeSelection = {}
  /** Arguments passed to the `practice-sentence` command */
  export type PracticeSentence = {}
}

