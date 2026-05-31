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
export type TranslationPromptMode = "translate" | "express-intent";

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  targetLanguageTitle: string;
  style: TranslationStyle;
  promptProfile: TranslationProfile;
  mode?: TranslationPromptMode;
}

export interface TranslateTextOptions {
  preferredLanguage?: string;
  mode?: TranslationPromptMode;
  style?: TranslationStyle;
  promptProfile?: TranslationProfile;
  fetchImpl?: typeof fetch;
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
  const mode = request.mode ?? "translate";
  const system = [
    systemRole(mode),
    "Before writing the answer, internally infer the speaker's intent, situation, relationship, implied tone, and practical purpose.",
    nativeExpressionInstruction(request.targetLanguageTitle),
    taskInstruction(mode),
    `Return only the ${mode === "express-intent" ? "final target-language wording" : "translation"}. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.`,
  ].join(" ");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Task: ${mode === "express-intent" ? "Express the source intention naturally in the target language." : "Translate the source text by meaning."}`,
    `Style: ${styleInstructions[request.style]}`,
    `Prompt profile: ${profileInstructions[request.promptProfile]}`,
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    mode === "express-intent"
      ? "The source may be rough Chinese notes or an intention brief. Do not mirror its wording, sentence order, filler words, or Chinese politeness formulas when a native speaker would phrase the idea differently."
      : "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    mode === "express-intent" ? "Intention:" : "Text:",
    request.text,
  ].join("\n");

  return { system, user };
}

export async function translateText(
  text: string,
  cfg: ChatConfig,
  preferredLanguageOrOptions: string | TranslateTextOptions = "auto",
  fetchImpl: typeof fetch = fetch,
): Promise<{
  translation: string;
  targetLanguage: string;
  targetLanguageTitle: string;
}> {
  const options =
    typeof preferredLanguageOrOptions === "string"
      ? { preferredLanguage: preferredLanguageOrOptions, fetchImpl }
      : {
          preferredLanguage: preferredLanguageOrOptions.preferredLanguage,
          mode: preferredLanguageOrOptions.mode,
          style: preferredLanguageOrOptions.style,
          promptProfile: preferredLanguageOrOptions.promptProfile,
          fetchImpl: preferredLanguageOrOptions.fetchImpl ?? fetch,
        };
  const mode = options.mode ?? "translate";
  const target = resolveTranslationTarget(options.preferredLanguage, text);
  const prompt = buildTranslationPrompt({
    text,
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
    style:
      options.style ?? (mode === "express-intent" ? "polished" : "balanced"),
    promptProfile: options.promptProfile ?? "general",
    mode,
  });
  const translation = await chatText(
    cfg,
    prompt.system,
    prompt.user,
    options.fetchImpl,
  );
  return {
    translation: stripMarkdownFence(translation),
    targetLanguage: target.language,
    targetLanguageTitle: target.title,
  };
}

function systemRole(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return "You are a professional cross-language expression coach and native-language editor.";
  }
  return "You are a professional meaning-first translator and native-language editor.";
}

function taskInstruction(mode: TranslationPromptMode): string {
  if (mode === "express-intent") {
    return [
      "Treat the source as the user's intended meaning, not as a sentence that must be mirrored.",
      "Write the result as something a native speaker of the target language would actually say or write in that situation.",
      "Choose natural collocations, register, directness, and sentence shape for the target culture.",
      "If the source says the user wants to say, remind, ask, explain, or express something, treat that framing as task instruction and write the actual utterance, not a report about wanting to say it.",
      "When the intention is addressed to someone, address that person directly unless the source clearly asks for third-person reporting.",
      "Preserve practical constraints such as deadlines, requested actions, permissions, and conditions while adapting the tone.",
      "Keep dates and deadlines precise; do not weaken, move, or blur them to sound more polite.",
      "Do not add unsupported concessions, excuses, alternatives, placeholder names, greetings, sign-offs, apologies, or promises merely to sound natural.",
      "Do not preserve Chinese word order, topic-comment structure, stock phrases, or literal politeness formulas unless they are genuinely natural in the target language.",
      "Do not invent new facts, promises, relationships, or emotional intensity that are not supported by the intention.",
    ].join(" ");
  }
  return "Translate complete sentences and paragraphs by meaning, not as isolated dictionary entries.";
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
  } else if (targetLanguageTitle.toLowerCase().includes("english")) {
    instructions.push(
      "For English, prefer concise, idiomatic wording; for polite requests, use clear modal phrasing such as could you or would it be possible rather than layered hedges or roundabout source-language buffers.",
      "Good English intent-expression examples: `我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。` -> `Could you send me the file by this afternoon when you get a chance?`; `我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。` -> `This isn't about you doing a bad job; we just didn't make the requirements clear enough from the start.`",
    );
  } else {
    instructions.push(
      "Avoid source-language calques and over-formal phrasing when a native speaker would choose a simpler expression.",
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
