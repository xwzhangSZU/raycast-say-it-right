/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Analysis Provider - Preferred provider when multiple API keys are set. If only one key is filled, that provider is used automatically. */
  "defaultAnalysisProvider": "openai" | "qwen" | "gemini" | "mimo",
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
  /** Qwen Analysis Base URL - Optional OpenAI-compatible base URL for Qwen ANALYSIS only, e.g. Alibaba Token Plan: https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1 . Empty = standard DashScope endpoint. TTS always uses the standard API. */
  "qwenAnalysisBaseURL"?: string,
  /** Qwen Analysis API Key - Optional separate key for Qwen ANALYSIS (e.g. a Token Plan sk-sp-… key). Falls back to the main Qwen key if empty. TTS always uses the main Qwen key. */
  "qwenAnalysisApiKey"?: string,
  /** Qwen TTS Voice - Voice for Qwen TTS (all support English). */
  "qwenTtsVoice": "Cherry" | "Jennifer" | "Katerina" | "Ethan" | "Ryan" | "Elias" | "Nofish",
  /** Gemini API Key - Google AI Studio key for Gemini analysis. Analysis only — Gemini does not do TTS here. */
  "geminiApiKey"?: string,
  /** Gemini Analysis Model - Gemini chat model for analysis. Default gemini-3.5-flash (best balance). For maximum accuracy try gemini-3.1-pro-preview; for always-latest use gemini-flash-latest. */
  "geminiAnalysisModel": string,
  /** MiMo (Xiaomi) API Key - Xiaomi MiMo key (tp-… for Token Plan, sk-… for pay-as-you-go). Used for MiMo analysis and TTS. */
  "mimoApiKey"?: string,
  /** MiMo Base URL - OpenAI-compatible base URL. Pay-as-you-go: https://api.xiaomimimo.com/v1 (default). Token Plan: token-plan-{cn,sgp,ams}.xiaomimimo.com/v1 (see your 订阅管理 page). */
  "mimoBaseURL": string,
  /** MiMo Analysis Model - MiMo chat model for analysis (thinking is disabled for speed/determinism). */
  "mimoAnalysisModel": "mimo-v2.5" | "mimo-v2.5-pro",
  /** MiMo TTS Voice - Voice for MiMo TTS (English voices). */
  "mimoTtsVoice": "Chloe" | "Mia" | "Milo" | "Dean",
  /** TTS Provider - Which provider synthesizes audio. */
  "ttsProvider": "follow-analysis" | "openai" | "qwen" | "mimo",
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

