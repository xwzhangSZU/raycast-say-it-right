export interface TranslationRenderState {
  translation?: string;
  targetLanguageTitle?: string;
  failed?: boolean;
}

export function renderTranslationMarkdown(
  source: string,
  state: TranslationRenderState,
): string {
  const lines = ["# Translation", "", "## Source", "", quoteBlock(source), ""];
  lines.push(`## ${state.targetLanguageTitle ?? "Target"}`);
  lines.push("");
  if (state.translation) {
    lines.push(state.translation);
  } else if (state.failed) {
    lines.push(
      "_Could not translate this text. Use Refresh Translation to try again._",
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
