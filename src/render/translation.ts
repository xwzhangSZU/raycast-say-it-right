export interface TranslationRenderState {
  translation?: string;
  targetLanguageTitle?: string;
  failed?: boolean;
}

export interface TranslationRenderOptions {
  title?: string;
  sourceTitle?: string;
  emptyLabel?: string;
}

export function renderTranslationMarkdown(
  source: string,
  state: TranslationRenderState,
  options: TranslationRenderOptions = {},
): string {
  const lines = [
    `# ${options.title ?? "Translation"}`,
    "",
    `## ${options.sourceTitle ?? "Source"}`,
    "",
    quoteBlock(source),
    "",
  ];
  lines.push(`## ${state.targetLanguageTitle ?? "Target"}`);
  lines.push("");
  if (state.translation) {
    lines.push(state.translation);
  } else if (state.failed) {
    lines.push(
      `_${options.emptyLabel ?? "Could not translate this text. Use Refresh Translation to try again."}_`,
    );
  } else {
    lines.push("_Translating..._");
  }
  return lines.join("\n");
}

function quoteBlock(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}
