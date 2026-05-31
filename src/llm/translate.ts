import { chatText, type ChatConfig } from "./client";
import { getLanguageTitle, resolveTargetLanguage } from "./languages";

export type TranslationStyle =
  | "balanced"
  | "faithful"
  | "polished"
  | "academic";
export type TranslationProfile =
  | "general"
  | "technical"
  | "academic"
  | "legal"
  | "subtitle";

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  targetLanguageTitle: string;
  style: TranslationStyle;
  promptProfile: TranslationProfile;
}

const styleInstructions: Record<TranslationStyle, string> = {
  balanced:
    "Prefer natural, accurate sense-for-sense translation with no unnecessary embellishment.",
  faithful:
    "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished:
    "Make the translation fluent and idiomatic in the target language while preserving the original meaning.",
  academic:
    "Use precise, formal academic prose while preserving concepts, citations, and legal or technical terminology.",
};

const profileInstructions: Record<TranslationProfile, string> = {
  general:
    "Use a general professional translation frame for everyday sentences and paragraphs.",
  technical:
    "Prioritize technical accuracy. Preserve API names, code identifiers, commands, parameters, logs, filenames, and exact error messages.",
  academic:
    "Use clear academic prose. Preserve citations, conceptual distinctions, argument structure, and discipline-specific terminology.",
  legal:
    "Use precise legal or policy language. Preserve defined terms, obligations, conditions, citations, article numbers, and modal verbs such as shall, may, and must.",
  subtitle:
    "Use natural spoken phrasing suitable for subtitles or dialogue. Keep sentences readable and avoid overly formal wording unless the source requires it.",
};

export function resolveTranslationTarget(
  preferredLanguage: string | undefined,
  text: string,
): { language: string; title: string } {
  const language = resolveTargetLanguage(preferredLanguage, text);
  return { language, title: getLanguageTitle(language) };
}

export function buildTranslationPrompt(request: TranslationRequest): {
  system: string;
  user: string;
} {
  const system = [
    "You are a professional meaning-first translator and native-language editor.",
    "Before writing the answer, internally infer the speaker's intent, situation, relationship, implied tone, and practical purpose.",
    nativeExpressionInstruction(request.targetLanguageTitle),
    "Translate complete sentences and paragraphs by meaning, not as isolated dictionary entries.",
    "Return only the translation. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.",
  ].join(" ");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Style: ${styleInstructions[request.style]}`,
    `Prompt profile: ${profileInstructions[request.promptProfile]}`,
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    "Text:",
    request.text,
  ].join("\n");

  return { system, user };
}

export async function translateText(
  text: string,
  cfg: ChatConfig,
  preferredLanguage = "auto",
  fetchImpl: typeof fetch = fetch,
): Promise<{
  translation: string;
  targetLanguage: string;
  targetLanguageTitle: string;
}> {
  const target = resolveTranslationTarget(preferredLanguage, text);
  const prompt = buildTranslationPrompt({
    text,
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
    style: "balanced",
    promptProfile: "general",
  });
  const translation = await chatText(
    cfg,
    prompt.system,
    prompt.user,
    fetchImpl,
  );
  return {
    translation: stripMarkdownFence(translation),
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
  };
}

function nativeExpressionInstruction(targetLanguageTitle: string): string {
  const instructions = [
    `Write in ${targetLanguageTitle} the way a native speaker would naturally express the same idea.`,
    "Prefer idiomatic, fluent target-language wording over literal word-for-word translation.",
    "Restructure sentences when needed so the result reads as originally written in the target language.",
    "Do not over-interpret, summarize, embellish, or add information that is not present in the source.",
    "Preserve the speaker's intent, tone, emphasis, factual content, and level of formality.",
  ];
  if (targetLanguageTitle.toLowerCase().includes("chinese")) {
    instructions.push(
      "For Chinese, write as a native Chinese speaker would describe the same idea, not as English syntax rewritten with Chinese words.",
    );
  }
  return instructions.join(" ");
}

function stripMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
