import type { ProsodyAnalysis, Word } from "../types";
import { SYM, toneArrow } from "./symbols";
import { alignColumns, type Col } from "./align";

function formatWord(w: Word): string {
  if (w.stressed && w.stressIndex !== null) {
    return w.syllables
      .map((s, i) => (i === w.stressIndex ? s.toUpperCase() : s.toLowerCase()))
      .join(SYM.SYLLABLE_DOT);
  }
  return w.syllables.join(SYM.SYLLABLE_DOT).toLowerCase();
}

/**
 * Returns ONLY the beat-bearing (stressed) syllable in uppercase, for the Rhythm
 * block. This is intentionally NOT the full syllable chain — the Rhythm view shows
 * the stress/beat grid, while the Stress & Intonation block shows full words.
 */
function rhythmBeatSyllable(w: Word): string {
  if (w.stressIndex !== null) return w.syllables[w.stressIndex].toUpperCase();
  return w.syllables.join("").toUpperCase();
}

function codeBlock(markLine: string, wordLine: string): string {
  return `\`\`\`\n${markLine}\n${wordLine}\n\`\`\``;
}

export function renderAnalysis(a: ProsodyAnalysis): string {
  // --- Stress & Intonation columns ---
  const intoCols: Col[] = [];
  a.thoughtGroups.forEach((g, gi) => {
    g.words.forEach((w) => {
      const base = w.stressed ? SYM.STRESS : SYM.WEAK;
      const mark = w.nuclear ? `${base} ${toneArrow(g.tone)}` : base;
      intoCols.push({ mark, word: formatWord(w) });
    });
    if (gi < a.thoughtGroups.length - 1)
      intoCols.push({ mark: "", word: SYM.GROUP });
  });
  const into = alignColumns(intoCols);

  // --- Rhythm columns ---
  const beatCols: Col[] = [];
  a.thoughtGroups.forEach((g, gi) => {
    g.words.forEach((w) => {
      beatCols.push({
        mark: w.stressed ? SYM.STRESS : SYM.WEAK,
        word: w.stressed ? rhythmBeatSyllable(w) : w.text.toLowerCase(),
      });
    });
    if (gi < a.thoughtGroups.length - 1)
      beatCols.push({ mark: "", word: SYM.GROUP });
  });
  const beat = alignColumns(beatCols);

  // --- linking notes ---
  const links: string[] = [];
  a.thoughtGroups.forEach((g) =>
    g.words.forEach((w, i) => {
      if (w.linkToNext && i < g.words.length - 1) {
        links.push(`${w.text}${SYM.LINK}${g.words[i + 1].text}`);
      }
    }),
  );

  const lines: string[] = [];
  lines.push("# 🗣️ How to say it");
  if (a.isGeneratedExample && a.sourceWord) {
    lines.push(`*Example sentence for **${a.sourceWord}**:*`);
  }
  lines.push(`> ${a.text}`);
  lines.push("");
  lines.push("## Stress & Intonation");
  lines.push(codeBlock(into.markLine, into.wordLine));
  lines.push(`\`${a.ipa}\``);
  if (links.length) lines.push(`*linking:* ${links.join("  ·  ")}`);
  lines.push("");
  lines.push("## Rhythm");
  lines.push(codeBlock(beat.markLine, beat.wordLine));
  if (a.notes) {
    lines.push("");
    lines.push(`> 💡 ${a.notes}`);
  }
  return lines.join("\n");
}
