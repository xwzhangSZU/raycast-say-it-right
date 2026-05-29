/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Analysis Provider - Default model provider for analysis. */
  "defaultAnalysisProvider": "openai" | "qwen",
  /** OpenAI API Key - Used for OpenAI analysis and TTS. */
  "openaiApiKey"?: string,
  /** OpenAI Analysis Model - Chat model for analysis. */
  "openaiAnalysisModel": string,
  /** OpenAI TTS Voice - Voice for OpenAI TTS. */
  "openaiTtsVoice": string,
  /** Qwen (DashScope) API Key - Used for Qwen analysis and TTS. */
  "qwenApiKey"?: string,
  /** Qwen Region - DashScope region (affects base URL). */
  "qwenRegion": "beijing" | "intl",
  /** Qwen Analysis Model - Chat model for analysis. */
  "qwenAnalysisModel": string,
  /** Qwen TTS Voice - Voice for Qwen TTS. */
  "qwenTtsVoice": string,
  /** TTS Provider - Which provider synthesizes audio. */
  "ttsProvider": "follow-analysis" | "openai" | "qwen",
  /** Slow Playback Rate - Target teaching speed for slow playback (e.g. 0.6). */
  "slowRate": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `analyze-text` command */
  export type AnalyzeText = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `analyze-text` command */
  export type AnalyzeText = {}
}

