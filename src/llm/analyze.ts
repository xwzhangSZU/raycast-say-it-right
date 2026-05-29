import type { ProsodyAnalysis } from "../types";
import { buildPrompt, parseAnalysis, type PromptOptions } from "./prompt";
import { chatJSON, type ChatConfig } from "./client";

export interface AnalyzeDeps {
  chat: (cfg: ChatConfig, system: string, user: string) => Promise<string>;
}

const defaultDeps: AnalyzeDeps = { chat: (cfg, s, u) => chatJSON(cfg, s, u) };

export async function analyze(
  text: string,
  opts: PromptOptions,
  cfg: ChatConfig,
  deps: AnalyzeDeps = defaultDeps,
): Promise<ProsodyAnalysis> {
  const { system, user } = buildPrompt(text, opts);
  const raw = await deps.chat(cfg, system, user);
  try {
    return parseAnalysis(raw);
  } catch (err) {
    const repairUser = `${user}\n\nYour previous response was invalid (${String(err).slice(0, 150)}). Return ONLY valid JSON matching the schema, no prose, no fences.`;
    const raw2 = await deps.chat(cfg, system, repairUser);
    return parseAnalysis(raw2); // if this still throws, the caller surfaces a toast
  }
}
