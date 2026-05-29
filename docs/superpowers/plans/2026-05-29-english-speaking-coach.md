# English Speaking Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Raycast (macOS) extension that analyzes selected English text for stress, intonation, rhythm, and linking, renders a text-annotation + rhythm-bar visualization, and reads a model sentence via OpenAI/Qwen neural TTS with slow/repeat.

**Architecture:** One `view` command reads the OS text selection, sends it to an OpenAI-compatible chat endpoint (OpenAI or Qwen via DashScope compatible-mode) that returns a strict `ProsodyAnalysis` JSON, which pure renderer code turns into Raycast `Detail` markdown. TTS is a separate adapter layer (OpenAI `/v1/audio/speech` returns audio bytes directly; Qwen `multimodal-generation` returns base64/URL) whose output is played through macOS `afplay`. All linguistically/rendering-critical logic lives in pure modules that do NOT import `@raycast/api`, so they are unit-testable with vitest; Raycast-coupled glue is verified by manual smoke tests.

**Tech Stack:** TypeScript, React, `@raycast/api`, `zod` (schema validation), `vitest` (tests), Node 26 global `fetch`, macOS `afplay`.

**Spec:** `docs/superpowers/specs/2026-05-29-english-speaking-coach-design.md`

---

## File Structure

```
english-speaking-coach/
├── package.json                  # Raycast manifest: command + preferences; deps; scripts
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── assets/extension-icon.png     # 512×512 PNG (placeholder OK for dev)
├── src/
│   ├── types.ts                  # ProsodyAnalysis + zod schema  [pure]
│   ├── __fixtures__/analysis.ts  # canonical EXAMPLE fixture       [pure]
│   ├── render/
│   │   ├── symbols.ts            # glyph constants                 [pure]
│   │   ├── align.ts              # alignColumns()                  [pure]
│   │   └── markdown.ts           # renderAnalysis() → markdown     [pure]
│   ├── lib/
│   │   ├── detect.ts             # isSingleWord()                  [pure]
│   │   ├── preferences.ts        # typed getPreferenceValues       [raycast]
│   │   ├── errors.ts             # error classes + toast helpers   [raycast]
│   │   └── cache.ts              # analysisCacheKey() + Cache      [mixed]
│   ├── llm/
│   │   ├── prompt.ts             # buildPrompt() + parseAnalysis() [pure]
│   │   ├── client.ts             # chatJSON()                      [pure]
│   │   ├── analyze.ts            # analyze() + repair retry        [pure]
│   │   └── config.ts             # resolveAnalysisConfig()         [pure]
│   ├── tts/
│   │   ├── types.ts              # TtsConfig, SynthesizeOptions    [pure]
│   │   ├── index.ts              # buildTtsInstructions()/getTts() [pure]
│   │   ├── playback.ts           # audioCacheKey/play/write        [pure-ish]
│   │   ├── openai.ts             # synthesizeOpenAI()              [pure]
│   │   └── qwen.ts               # synthesizeQwen()                [pure]
│   ├── components/
│   │   ├── AnalysisDetail.tsx    # Detail + ActionPanel            [raycast]
│   │   └── TextInputForm.tsx     # manual input form               [raycast]
│   └── analyze-text.tsx          # command entry / orchestration   [raycast]
└── tests/                        # vitest specs mirror src/ paths
```

**Note vs spec:** the spec listed `llm/openai.ts` + `llm/qwen.ts` separately. Because Qwen uses an OpenAI-compatible chat endpoint, the analysis logic is identical and only the config (baseURL/apiKey/model) differs — so analysis is **one** `analyze.ts` driven by `config.ts` (DRY). TTS keeps two adapters because the two TTS APIs differ in shape.

---

## PHASE 1 — Analysis + Rendering (ends at Milestone 1: select text → see annotated analysis)

### Task 1: Scaffold the Raycast extension project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json`, `assets/extension-icon.png`

- [ ] **Step 1: Create `package.json`**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "english-speaking-coach",
  "title": "English Speaking Coach",
  "description": "Analyze selected English text for stress, intonation, rhythm; hear a model reading.",
  "icon": "extension-icon.png",
  "author": "xianweizhang",
  "categories": ["Education", "Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "analyze-text",
      "title": "Analyze Text",
      "subtitle": "Speaking Coach",
      "description": "Analyze selected English text for stress, intonation, and rhythm.",
      "mode": "view"
    }
  ],
  "preferences": [
    { "name": "defaultAnalysisProvider", "title": "Analysis Provider", "description": "Default model provider for analysis.", "type": "dropdown", "required": false, "default": "openai",
      "data": [ { "title": "OpenAI", "value": "openai" }, { "title": "Qwen", "value": "qwen" } ] },
    { "name": "openaiApiKey", "title": "OpenAI API Key", "description": "Used for OpenAI analysis and TTS.", "type": "password", "required": false },
    { "name": "openaiAnalysisModel", "title": "OpenAI Analysis Model", "description": "Chat model for analysis.", "type": "textfield", "required": false, "default": "gpt-4o-mini" },
    { "name": "openaiTtsVoice", "title": "OpenAI TTS Voice", "description": "Voice for OpenAI TTS.", "type": "textfield", "required": false, "default": "alloy" },
    { "name": "qwenApiKey", "title": "Qwen (DashScope) API Key", "description": "Used for Qwen analysis and TTS.", "type": "password", "required": false },
    { "name": "qwenRegion", "title": "Qwen Region", "description": "DashScope region (affects base URL).", "type": "dropdown", "required": false, "default": "beijing",
      "data": [ { "title": "Beijing (cn)", "value": "beijing" }, { "title": "International (Singapore)", "value": "intl" } ] },
    { "name": "qwenAnalysisModel", "title": "Qwen Analysis Model", "description": "Chat model for analysis.", "type": "textfield", "required": false, "default": "qwen-flash" },
    { "name": "qwenTtsVoice", "title": "Qwen TTS Voice", "description": "Voice for Qwen TTS.", "type": "textfield", "required": false, "default": "Cherry" },
    { "name": "ttsProvider", "title": "TTS Provider", "description": "Which provider synthesizes audio.", "type": "dropdown", "required": false, "default": "follow-analysis",
      "data": [ { "title": "Follow Analysis Provider", "value": "follow-analysis" }, { "title": "OpenAI", "value": "openai" }, { "title": "Qwen", "value": "qwen" } ] },
    { "name": "slowRate", "title": "Slow Playback Rate", "description": "Target teaching speed for slow playback (e.g. 0.6).", "type": "textfield", "required": false, "default": "0.6" }
  ],
  "dependencies": { "@raycast/api": "^1.80.0", "@raycast/utils": "^1.17.0", "zod": "^3.23.0" },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11", "@types/node": "^22.0.0", "@types/react": "^18.3.0",
    "eslint": "^8.57.0", "prettier": "^3.3.0", "typescript": "^5.5.0", "vitest": "^2.0.0"
  },
  "scripts": {
    "build": "ray build -e dist", "dev": "ray develop", "lint": "ray lint",
    "fix-lint": "ray lint --fix", "test": "vitest run", "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["ES2023"], "module": "commonjs", "target": "ES2022",
    "strict": true, "isolatedModules": true, "esModuleInterop": true,
    "skipLibCheck": true, "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx", "resolveJsonModule": true, "moduleResolution": "node"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Create `.eslintrc.json`**

```json
{ "root": true, "extends": ["@raycast"] }
```

- [ ] **Step 5: Create a placeholder icon**

Run: `mkdir -p assets && printf '' > assets/.keep`
Then add any 512×512 PNG at `assets/extension-icon.png` (a solid-color placeholder is fine for development; replace before publishing). If you have ImageMagick: `magick -size 512x512 xc:'#1c1c1e' assets/extension-icon.png`.

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` created (already gitignored).

- [ ] **Step 7: Verify toolchain**

Run: `npx vitest run`
Expected: "No test files found" (exit 0 or a clear no-tests message) — runner works.
Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Raycast extension project and toolchain"
```

---

### Task 2: Core types and zod schema

**Files:**
- Create: `src/types.ts`, `src/__fixtures__/analysis.ts`
- Test: `tests/types.test.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
import { z } from "zod";

export const ToneSchema = z.enum(["fall", "rise", "fall-rise", "rise-fall", "level"]);
export const LinkSchema = z.enum(["liaison", "elision", "intrusion"]).nullable();

export const WordSchema = z.object({
  text: z.string().min(1),
  syllables: z.array(z.string().min(1)).min(1),
  stressIndex: z.number().int().nonnegative().nullable(),
  stressed: z.boolean(),
  nuclear: z.boolean(),
  ipa: z.string().optional(),
  linkToNext: LinkSchema.optional(),
});

export const ThoughtGroupSchema = z.object({
  tone: ToneSchema,
  words: z.array(WordSchema).min(1),
});

export const ProsodyAnalysisSchema = z.object({
  text: z.string().min(1),
  isGeneratedExample: z.boolean(),
  sourceWord: z.string().optional(),
  ipa: z.string(),
  thoughtGroups: z.array(ThoughtGroupSchema).min(1),
  notes: z.string().optional(),
});

export type Tone = z.infer<typeof ToneSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Word = z.infer<typeof WordSchema>;
export type ThoughtGroup = z.infer<typeof ThoughtGroupSchema>;
export type ProsodyAnalysis = z.infer<typeof ProsodyAnalysisSchema>;
```

- [ ] **Step 2: Write `src/__fixtures__/analysis.ts`**

```ts
import type { ProsodyAnalysis } from "../types";

export const EXAMPLE: ProsodyAnalysis = {
  text: "If you finish early, give me a call.",
  isGeneratedExample: false,
  ipa: "/ɪf ju ˈfɪnɪʃ ˈɝli ‖ ˈɡɪv mi ə ˈkɔl/",
  thoughtGroups: [
    {
      tone: "rise",
      words: [
        { text: "If", syllables: ["If"], stressIndex: null, stressed: false, nuclear: false },
        { text: "you", syllables: ["you"], stressIndex: null, stressed: false, nuclear: false },
        { text: "finish", syllables: ["fin", "ish"], stressIndex: 0, stressed: true, nuclear: false, linkToNext: "liaison" },
        { text: "early", syllables: ["ear", "ly"], stressIndex: 0, stressed: true, nuclear: true },
      ],
    },
    {
      tone: "fall",
      words: [
        { text: "give", syllables: ["give"], stressIndex: 0, stressed: true, nuclear: false },
        { text: "me", syllables: ["me"], stressIndex: null, stressed: false, nuclear: false },
        { text: "a", syllables: ["a"], stressIndex: null, stressed: false, nuclear: false },
        { text: "call", syllables: ["call"], stressIndex: 0, stressed: true, nuclear: true },
      ],
    },
  ],
  notes: "Let the pitch rise on “early” to signal more is coming, then fall firmly on “call.”",
};
```

- [ ] **Step 3: Write the failing test `tests/types.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { ProsodyAnalysisSchema } from "../src/types";
import { EXAMPLE } from "../src/__fixtures__/analysis";

describe("ProsodyAnalysisSchema", () => {
  it("accepts the canonical example", () => {
    expect(() => ProsodyAnalysisSchema.parse(EXAMPLE)).not.toThrow();
  });
  it("rejects a word missing required fields", () => {
    const bad = { ...EXAMPLE, thoughtGroups: [{ tone: "rise", words: [{ text: "x" }] }] };
    expect(() => ProsodyAnalysisSchema.parse(bad)).toThrow();
  });
  it("rejects an invalid tone", () => {
    const bad = { ...EXAMPLE, thoughtGroups: [{ ...EXAMPLE.thoughtGroups[0], tone: "wobble" }] };
    expect(() => ProsodyAnalysisSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/types.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/__fixtures__/analysis.ts tests/types.test.ts
git commit -m "feat: add ProsodyAnalysis types and zod schema"
```

---

### Task 3: Symbols and column alignment

**Files:**
- Create: `src/render/symbols.ts`, `src/render/align.ts`
- Test: `tests/render/align.test.ts`

- [ ] **Step 1: Write `src/render/symbols.ts`**

```ts
// All glyphs are width-1 in common monospace fonts. If Raycast renders any as
// width-2 (misaligned during smoke test), swap that constant to an ASCII fallback.
export const SYM = {
  STRESS: "●", // ●  stressed
  WEAK: "·", //   ·  unstressed
  RISE: "↗", //   ↗
  FALL: "↘", //   ↘
  FALL_RISE: "↘↗", // ↘↗
  RISE_FALL: "↗↘", // ↗↘
  LEVEL: "→", //  →
  GROUP: "‖", //  ‖  thought-group boundary
  SYLLABLE_DOT: "·", // · between syllables
  LINK: "‿", //   ‿  linking
} as const;

import type { Tone } from "../types";
export function toneArrow(tone: Tone): string {
  switch (tone) {
    case "rise": return SYM.RISE;
    case "fall": return SYM.FALL;
    case "fall-rise": return SYM.FALL_RISE;
    case "rise-fall": return SYM.RISE_FALL;
    case "level": return SYM.LEVEL;
  }
}
```

- [ ] **Step 2: Write the failing test `tests/render/align.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { alignColumns } from "../../src/render/align";

describe("alignColumns", () => {
  it("places each mark above the start of its word with gap spacing", () => {
    const { markLine, wordLine } = alignColumns(
      [ { mark: ".", word: "if" }, { mark: "O", word: "FINISH" } ],
      2,
    );
    // column widths: max(1,2)=2 ; max(1,6)=6 ; gap=2
    expect(wordLine).toBe("if  FINISH");
    expect(markLine).toBe(".   O");
  });
  it("trims trailing whitespace", () => {
    const { markLine } = alignColumns([{ mark: ".", word: "hello" }], 2);
    expect(markLine).toBe(".");
  });
  it("counts code points, not UTF-16 units, for width", () => {
    const { markLine, wordLine } = alignColumns([{ mark: "●", word: "go" }, { mark: ".", word: "x" }], 1);
    // first col width = max(1,2) = 2 → mark "●" padded to 2 then gap 1 then "."
    expect(wordLine).toBe("go x");
    expect(markLine).toBe("●  .".replace("  ", " ".repeat(2))); // "● ." with mark padded to width 2: "●" + " " + " " + "."? see impl
  });
});
```

> Note: the third assertion is fiddly — if it distracts, keep only the first two. The first two fully pin the algorithm.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/render/align.test.ts`
Expected: FAIL ("alignColumns is not a function" / cannot find module).

- [ ] **Step 4: Write `src/render/align.ts`**

```ts
const cpLen = (s: string): number => [...s].length;
const padEnd = (s: string, width: number): string => s + " ".repeat(Math.max(0, width - cpLen(s)));
const trimEnd = (s: string): string => s.replace(/\s+$/u, "");

export interface Col {
  mark: string;
  word: string;
}

export function alignColumns(cols: Col[], gap = 2): { markLine: string; wordLine: string } {
  const sep = " ".repeat(gap);
  const marks: string[] = [];
  const words: string[] = [];
  for (const c of cols) {
    const width = Math.max(cpLen(c.mark), cpLen(c.word));
    marks.push(padEnd(c.mark, width));
    words.push(padEnd(c.word, width));
  }
  return { markLine: trimEnd(marks.join(sep)), wordLine: trimEnd(words.join(sep)) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/render/align.test.ts`
Expected: PASS (drop the 3rd assertion if its expectation string is off — the algorithm is correct; the test string was the issue).

- [ ] **Step 6: Commit**

```bash
git add src/render/symbols.ts src/render/align.ts tests/render/align.test.ts
git commit -m "feat: add prosody glyph constants and monospace column alignment"
```

---

### Task 4: Markdown renderer (B + C visualization)

**Files:**
- Create: `src/render/markdown.ts`
- Test: `tests/render/markdown.test.ts`

- [ ] **Step 1: Write `src/render/markdown.ts`**

```ts
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

function stressedSyllableUpper(w: Word): string {
  if (w.stressIndex !== null) return w.syllables[w.stressIndex].toUpperCase();
  return w.syllables.join("").toUpperCase();
}

function codeBlock(markLine: string, wordLine: string): string {
  return "```\n" + markLine + "\n" + wordLine + "\n```";
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
    if (gi < a.thoughtGroups.length - 1) intoCols.push({ mark: "", word: SYM.GROUP });
  });
  const into = alignColumns(intoCols);

  // --- Rhythm columns ---
  const beatCols: Col[] = [];
  a.thoughtGroups.forEach((g, gi) => {
    g.words.forEach((w) => {
      beatCols.push({
        mark: w.stressed ? SYM.STRESS : SYM.WEAK,
        word: w.stressed ? stressedSyllableUpper(w) : w.text.toLowerCase(),
      });
    });
    if (gi < a.thoughtGroups.length - 1) beatCols.push({ mark: "", word: SYM.GROUP });
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
```

- [ ] **Step 2: Write the failing test `tests/render/markdown.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { renderAnalysis } from "../../src/render/markdown";
import { EXAMPLE } from "../../src/__fixtures__/analysis";

describe("renderAnalysis", () => {
  const md = renderAnalysis(EXAMPLE);

  it("uppercases the stressed syllable of content words", () => {
    expect(md).toContain("FIN·ish"); // FIN·ish
    expect(md).toContain("EAR·ly");
    expect(md).toContain("GIVE");
    expect(md).toContain("CALL");
  });
  it("lowercases function words", () => {
    expect(md).toMatch(/\bif\b/);
    expect(md).toMatch(/\byou\b/);
  });
  it("shows the rising tone on the first group and falling on the second", () => {
    expect(md).toContain("↗"); // ↗
    expect(md).toContain("↘"); // ↘
  });
  it("marks the thought-group boundary and IPA and linking", () => {
    expect(md).toContain("‖"); // ‖
    expect(md).toContain(EXAMPLE.ipa);
    expect(md).toContain("finish‿early"); // finish‿early
  });
  it("keeps mark line and word line in each code block on adjacent lines", () => {
    const blocks = md.split("```").filter((_, i) => i % 2 === 1);
    expect(blocks.length).toBe(2); // intonation + rhythm
    for (const b of blocks) {
      const rows = b.trim().split("\n");
      expect(rows.length).toBe(2);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then passes after Step 1 exists**

Run: `npx vitest run tests/render/markdown.test.ts`
Expected: PASS (all 5). If a content assertion fails, fix `markdown.ts` (not the test).

- [ ] **Step 4: Commit**

```bash
git add src/render/markdown.ts tests/render/markdown.test.ts
git commit -m "feat: render ProsodyAnalysis as stress/intonation + rhythm markdown"
```

---

### Task 5: Single-word detection

**Files:**
- Create: `src/lib/detect.ts`
- Test: `tests/lib/detect.test.ts`

- [ ] **Step 1: Write the failing test `tests/lib/detect.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isSingleWord } from "../../src/lib/detect";

describe("isSingleWord", () => {
  it("treats one alphabetic token as a word", () => {
    expect(isSingleWord("serendipity")).toBe(true);
    expect(isSingleWord("  hello  ")).toBe(true);
    expect(isSingleWord("don't")).toBe(true);
  });
  it("treats multiple tokens or punctuation-bearing phrases as not a word", () => {
    expect(isSingleWord("give me a call")).toBe(false);
    expect(isSingleWord("Hello, world.")).toBe(false);
    expect(isSingleWord("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/detect.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/detect.ts`**

```ts
export function isSingleWord(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  // one token, letters with optional internal apostrophe/hyphen
  return /^[\p{L}]+(?:['’-][\p{L}]+)*$/u.test(t);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/detect.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/detect.ts tests/lib/detect.test.ts
git commit -m "feat: detect single-word vs phrase input"
```

---

### Task 6: Analysis prompt and response parsing

**Files:**
- Create: `src/llm/prompt.ts`
- Test: `tests/llm/prompt.test.ts`

- [ ] **Step 1: Write `src/llm/prompt.ts`**

```ts
import { ProsodyAnalysisSchema, type ProsodyAnalysis } from "../types";

export interface PromptOptions {
  isWord: boolean;
  accent: "GA";
}

const SCHEMA_HINT = `Return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "text": string,                 // the sentence analyzed
  "isGeneratedExample": boolean,
  "sourceWord"?: string,
  "ipa": string,                  // whole-sentence IPA, General American, wrapped in / /
  "thoughtGroups": [              // split at clause/comma boundaries
    { "tone": "fall"|"rise"|"fall-rise"|"rise-fall"|"level",
      "words": [
        { "text": string,
          "syllables": string[],          // e.g. ["fin","ish"]
          "stressIndex": number|null,     // index of the lexically stressed syllable; null for reduced function words
          "stressed": boolean,            // sentence prominence: true for content words, false for reduced function words
          "nuclear": boolean,             // the tonic/nuclear word of its thought group (carries the tone)
          "ipa"?: string,
          "linkToNext"?: "liaison"|"elision"|"intrusion"|null
        }
      ]
    }
  ],
  "notes"?: string                // ONE short coaching tip
}`;

export function buildPrompt(text: string, opts: PromptOptions): { system: string; user: string } {
  const system = [
    "You are an expert English pronunciation coach specializing in General American prosody.",
    "Analyze the given English text for word stress, sentence stress, intonation (rising/falling tones per thought group), rhythm, and connected-speech linking.",
    "Rules: content words (nouns, main verbs, adjectives, adverbs, wh-words) are usually stressed; function words (articles, prepositions, auxiliaries, pronouns) are usually reduced. Each thought group has exactly one nuclear word, normally its last content word. Use General American IPA.",
    SCHEMA_HINT,
  ].join("\n\n");

  const user = opts.isWord
    ? `The user selected a single word: "${text}". Set isGeneratedExample=true, sourceWord="${text}", generate ONE natural example sentence using it, put that sentence in "text", and analyze that sentence.`
    : `Analyze this text: "${text}". Set isGeneratedExample=false.`;

  return { system, user };
}

export function parseAnalysis(raw: string): ProsodyAnalysis {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const json = JSON.parse(cleaned);
  return ProsodyAnalysisSchema.parse(json);
}
```

- [ ] **Step 2: Write the failing test `tests/llm/prompt.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildPrompt, parseAnalysis } from "../../src/llm/prompt";
import { EXAMPLE } from "../../src/__fixtures__/analysis";

describe("buildPrompt", () => {
  it("asks to generate an example for single-word input", () => {
    const { user } = buildPrompt("serendipity", { isWord: true, accent: "GA" });
    expect(user).toContain("single word");
    expect(user).toContain("serendipity");
  });
  it("analyzes phrase input as-is", () => {
    const { user } = buildPrompt("give me a call", { isWord: false, accent: "GA" });
    expect(user).toContain("Analyze this text");
  });
});

describe("parseAnalysis", () => {
  it("parses clean JSON", () => {
    const out = parseAnalysis(JSON.stringify(EXAMPLE));
    expect(out.text).toBe(EXAMPLE.text);
  });
  it("strips markdown code fences", () => {
    const out = parseAnalysis("```json\n" + JSON.stringify(EXAMPLE) + "\n```");
    expect(out.thoughtGroups.length).toBe(2);
  });
  it("throws on schema-invalid JSON", () => {
    expect(() => parseAnalysis(JSON.stringify({ text: "x" }))).toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/llm/prompt.test.ts`
Expected: PASS (5).

- [ ] **Step 4: Commit**

```bash
git add src/llm/prompt.ts tests/llm/prompt.test.ts
git commit -m "feat: add analysis prompt builder and response parser"
```

---

### Task 7: OpenAI-compatible chat client

**Files:**
- Create: `src/llm/client.ts`
- Test: `tests/llm/client.test.ts`

- [ ] **Step 1: Write `src/llm/client.ts`**

```ts
export interface ChatConfig {
  baseURL: string; // e.g. https://api.openai.com/v1
  apiKey: string;
  model: string;
}

export class ChatError extends Error {}

export async function chatJSON(
  cfg: ChatConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatError(`Chat API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new ChatError("Chat response had no text content");
  return content;
}
```

- [ ] **Step 2: Write the failing test `tests/llm/client.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { chatJSON, ChatError, type ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = { baseURL: "https://api.test/v1", apiKey: "sk-x", model: "m" };

function mockFetch(status: number, json: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  })) as unknown as typeof fetch;
}

describe("chatJSON", () => {
  it("POSTs to /chat/completions with auth + json_object and returns content", async () => {
    const f = mockFetch(200, { choices: [{ message: { content: "{\"ok\":true}" } }] });
    const out = await chatJSON(cfg, "sys", "usr", f);
    expect(out).toBe("{\"ok\":true}");
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://api.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-x");
    expect(init.body).toContain("\"json_object\"");
  });
  it("throws ChatError on non-2xx", async () => {
    const f = mockFetch(401, { error: "bad key" });
    await expect(chatJSON(cfg, "s", "u", f)).rejects.toBeInstanceOf(ChatError);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/llm/client.test.ts`
Expected: PASS (2).

- [ ] **Step 4: Commit**

```bash
git add src/llm/client.ts tests/llm/client.test.ts
git commit -m "feat: add OpenAI-compatible chat JSON client"
```

---

### Task 8: Analyze orchestration with repair retry

**Files:**
- Create: `src/llm/analyze.ts`
- Test: `tests/llm/analyze.test.ts`

- [ ] **Step 1: Write `src/llm/analyze.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test `tests/llm/analyze.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { analyze } from "../../src/llm/analyze";
import { EXAMPLE } from "../../src/__fixtures__/analysis";
import type { ChatConfig } from "../../src/llm/client";

const cfg: ChatConfig = { baseURL: "b", apiKey: "k", model: "m" };
const good = JSON.stringify(EXAMPLE);

describe("analyze", () => {
  it("returns parsed analysis on first valid response", async () => {
    const chat = vi.fn(async () => good);
    const out = await analyze("give me a call", { isWord: false, accent: "GA" }, cfg, { chat });
    expect(out.text).toBe(EXAMPLE.text);
    expect(chat).toHaveBeenCalledTimes(1);
  });
  it("retries once with a repair instruction when first response is invalid", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(good);
    const out = await analyze("x", { isWord: false, accent: "GA" }, cfg, { chat });
    expect(out.thoughtGroups.length).toBe(2);
    expect(chat).toHaveBeenCalledTimes(2);
    expect((chat.mock.calls[1][2] as string)).toContain("invalid");
  });
  it("throws if the repair attempt is also invalid", async () => {
    const chat = vi.fn(async () => "still not json");
    await expect(analyze("x", { isWord: false, accent: "GA" }, cfg, { chat })).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/llm/analyze.test.ts`
Expected: PASS (3).

- [ ] **Step 4: Commit**

```bash
git add src/llm/analyze.ts tests/llm/analyze.test.ts
git commit -m "feat: add analyze() with one JSON repair retry"
```

---

### Task 9: Provider config resolution

**Files:**
- Create: `src/llm/config.ts`
- Test: `tests/llm/config.test.ts`

- [ ] **Step 1: Write `src/llm/config.ts`**

```ts
import type { ChatConfig } from "./client";

export type ProviderName = "openai" | "qwen";

export interface RawPrefs {
  openaiApiKey?: string;
  openaiAnalysisModel?: string;
  qwenApiKey?: string;
  qwenAnalysisModel?: string;
  qwenRegion?: "beijing" | "intl";
}

export const QWEN_BASE = {
  beijing: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  intl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
} as const;

export class MissingKeyError extends Error {
  constructor(public provider: ProviderName) {
    super(`Missing API key for ${provider}`);
  }
}

export function resolveAnalysisConfig(provider: ProviderName, prefs: RawPrefs): ChatConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return { baseURL: "https://api.openai.com/v1", apiKey: prefs.openaiApiKey, model: prefs.openaiAnalysisModel || "gpt-4o-mini" };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  return { baseURL: QWEN_BASE[region], apiKey: prefs.qwenApiKey, model: prefs.qwenAnalysisModel || "qwen-flash" };
}
```

- [ ] **Step 2: Write the failing test `tests/llm/config.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { resolveAnalysisConfig, MissingKeyError, QWEN_BASE } from "../../src/llm/config";

describe("resolveAnalysisConfig", () => {
  it("builds OpenAI config", () => {
    const c = resolveAnalysisConfig("openai", { openaiApiKey: "sk", openaiAnalysisModel: "gpt-x" });
    expect(c.baseURL).toBe("https://api.openai.com/v1");
    expect(c.model).toBe("gpt-x");
  });
  it("builds Qwen config with region-specific base URL", () => {
    const c = resolveAnalysisConfig("qwen", { qwenApiKey: "sk", qwenRegion: "intl" });
    expect(c.baseURL).toBe(QWEN_BASE.intl);
    expect(c.model).toBe("qwen-flash");
  });
  it("throws MissingKeyError when key absent", () => {
    expect(() => resolveAnalysisConfig("openai", {})).toThrow(MissingKeyError);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/llm/config.test.ts`
Expected: PASS (3).

- [ ] **Step 4: Commit**

```bash
git add src/llm/config.ts tests/llm/config.test.ts
git commit -m "feat: resolve analysis provider config from preferences"
```

---

### Task 10: Raycast glue — preferences, errors, cache key

**Files:**
- Create: `src/lib/preferences.ts`, `src/lib/errors.ts`, `src/lib/cache.ts`
- Test: `tests/lib/cache.test.ts`

- [ ] **Step 1: Write `src/lib/preferences.ts`**

```ts
import { getPreferenceValues } from "@raycast/api";
import type { ProviderName, RawPrefs } from "../llm/config";

export interface Prefs extends RawPrefs {
  defaultAnalysisProvider: ProviderName;
  openaiTtsVoice?: string;
  qwenTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen";
  slowRate?: string;
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}
```

- [ ] **Step 2: Write `src/lib/errors.ts`**

```ts
import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { MissingKeyError } from "../llm/config";

export async function reportError(err: unknown): Promise<void> {
  if (err instanceof MissingKeyError) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Missing ${err.provider} API key`,
      message: "Open preferences to add it",
      primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: String(err).slice(0, 200) });
}
```

- [ ] **Step 3: Write the failing test `tests/lib/cache.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { analysisCacheKey } from "../../src/lib/cache";

describe("analysisCacheKey", () => {
  it("is stable for identical inputs and varies by provider/accent", () => {
    const a = analysisCacheKey("hello", "openai", "GA");
    const b = analysisCacheKey("hello", "openai", "GA");
    const c = analysisCacheKey("hello", "qwen", "GA");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
```

- [ ] **Step 4: Write `src/lib/cache.ts`** (the key function is pure + tested; the Cache wrapper imports `@raycast/api` but is trivial)

```ts
import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import { ProsodyAnalysisSchema, type ProsodyAnalysis } from "../types";

const cache = new Cache({ namespace: "analysis" });

export function analysisCacheKey(text: string, provider: string, accent: string): string {
  return createHash("sha1").update(`${provider} ${accent} ${text.trim()}`).digest("hex").slice(0, 20);
}

export function readAnalysisCache(key: string): ProsodyAnalysis | null {
  const raw = cache.get(key);
  if (!raw) return null;
  const parsed = ProsodyAnalysisSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export function writeAnalysisCache(key: string, analysis: ProsodyAnalysis): void {
  cache.set(key, JSON.stringify(analysis));
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run tests/lib/cache.test.ts`
Expected: PASS (1).
Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/preferences.ts src/lib/errors.ts src/lib/cache.ts tests/lib/cache.test.ts
git commit -m "feat: add preferences, error toasts, and analysis cache"
```

---

### Task 11: AnalysisDetail component (read-only, no TTS yet)

**Files:**
- Create: `src/components/AnalysisDetail.tsx`

- [ ] **Step 1: Write `src/components/AnalysisDetail.tsx`**

```tsx
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { ProsodyAnalysis } from "../types";
import type { ProviderName } from "../llm/config";
import { renderAnalysis } from "../render/markdown";

export interface AnalysisDetailProps {
  analysis: ProsodyAnalysis;
  provider: ProviderName;
  isLoading: boolean;
  onSwitchProvider: () => void;
  onNewExample?: () => void;
}

export function AnalysisDetail(props: AnalysisDetailProps): JSX.Element {
  const { analysis, provider, isLoading } = props;
  const markdown = renderAnalysis(analysis);
  const other: ProviderName = provider === "openai" ? "qwen" : "openai";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Provider" text={provider} />
          <Detail.Metadata.Label title="Accent" text="General American" />
          {analysis.isGeneratedExample && analysis.sourceWord ? (
            <Detail.Metadata.Label title="Example for" text={analysis.sourceWord} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title={`Switch to ${other}`} icon={Icon.Switch} shortcut={{ modifiers: ["cmd"], key: "p" }} onAction={props.onSwitchProvider} />
          {props.onNewExample ? (
            <Action title="New Example Sentence" icon={Icon.Repeat} shortcut={{ modifiers: ["cmd"], key: "d" }} onAction={props.onNewExample} />
          ) : null}
          <Action.CopyToClipboard title="Copy Annotation" content={markdown} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard title="Copy IPA" content={analysis.ipa} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (No unit test — `@raycast/api` UI is verified in the smoke test at Task 13.)

- [ ] **Step 3: Commit**

```bash
git add src/components/AnalysisDetail.tsx
git commit -m "feat: add read-only AnalysisDetail view with provider switch"
```

---

### Task 12: TextInputForm component (manual input fallback)

**Files:**
- Create: `src/components/TextInputForm.tsx`

- [ ] **Step 1: Write `src/components/TextInputForm.tsx`**

```tsx
import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

export function TextInputForm(props: { onSubmit: (text: string) => void }): JSX.Element {
  const [text, setText] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Analyze"
            icon={Icon.Microphone}
            onSubmit={(values: { text: string }) => props.onSubmit(values.text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="English text" placeholder="Paste a word or sentence to practice…" value={text} onChange={setText} />
    </Form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/TextInputForm.tsx
git commit -m "feat: add manual text input form fallback"
```

---

### Task 13: Command entry orchestration — MILESTONE 1

**Files:**
- Create: `src/analyze-text.tsx`

- [ ] **Step 1: Write `src/analyze-text.tsx`**

```tsx
import { getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import type { ProsodyAnalysis } from "./types";
import type { ProviderName } from "./llm/config";
import { resolveAnalysisConfig } from "./llm/config";
import { analyze } from "./llm/analyze";
import { isSingleWord } from "./lib/detect";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import { analysisCacheKey, readAnalysisCache, writeAnalysisCache } from "./lib/cache";
import { AnalysisDetail } from "./components/AnalysisDetail";
import { TextInputForm } from "./components/TextInputForm";

export default function Command(): JSX.Element {
  const prefs = getPrefs();
  const [text, setText] = useState<string | null>(null);
  const [needsInput, setNeedsInput] = useState(false);
  const [analysis, setAnalysis] = useState<ProsodyAnalysis | null>(null);
  const [provider, setProvider] = useState<ProviderName>(prefs.defaultAnalysisProvider || "openai");
  const [isLoading, setIsLoading] = useState(true);

  // Read selection on mount.
  useEffect(() => {
    (async () => {
      try {
        const sel = (await getSelectedText())?.trim();
        if (sel) setText(sel);
        else { setNeedsInput(true); setIsLoading(false); }
      } catch {
        setNeedsInput(true);
        setIsLoading(false);
      }
    })();
  }, []);

  const run = useCallback(
    async (input: string, prov: ProviderName, forceFresh = false) => {
      setIsLoading(true);
      try {
        const isWord = isSingleWord(input);
        const key = analysisCacheKey(input, prov, "GA");
        const cached = forceFresh ? null : readAnalysisCache(key);
        if (cached) {
          setAnalysis(cached);
        } else {
          const cfg = resolveAnalysisConfig(prov, prefs);
          const result = await analyze(input, { isWord, accent: "GA" }, cfg);
          writeAnalysisCache(key, result);
          setAnalysis(result);
        }
      } catch (err) {
        await reportError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [prefs],
  );

  useEffect(() => {
    if (text) void run(text, provider);
  }, [text, provider, run]);

  const onSwitchProvider = useCallback(() => {
    const next: ProviderName = provider === "openai" ? "qwen" : "openai";
    setProvider(next);
    void showToast({ style: Toast.Style.Animated, title: `Re-analyzing with ${next}…` });
  }, [provider]);

  const onNewExample = useCallback(() => {
    if (text) void run(text, provider, true);
  }, [text, provider, run]);

  if (needsInput && !text) {
    return <TextInputForm onSubmit={(t) => { setNeedsInput(false); setText(t.trim()); }} />;
  }
  if (!analysis) {
    return <AnalysisDetailPlaceholder isLoading={isLoading} />;
  }
  return (
    <AnalysisDetail
      analysis={analysis}
      provider={provider}
      isLoading={isLoading}
      onSwitchProvider={onSwitchProvider}
      onNewExample={analysis.isGeneratedExample ? onNewExample : undefined}
    />
  );
}

import { Detail } from "@raycast/api";
function AnalysisDetailPlaceholder(props: { isLoading: boolean }): JSX.Element {
  return <Detail isLoading={props.isLoading} markdown={"# 🗣️ Analyzing…\n\nReading your selection and asking the model."} />;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx ray lint`
Expected: exit 0 (fix any lint issues with `npx ray lint --fix`).

- [ ] **Step 3: Manual smoke test (Milestone 1)**

Run: `npm run dev` (starts `ray develop`; the command appears in Raycast).
1. Add your OpenAI API key in the extension preferences (⌘, on the command in Raycast, or Raycast Settings → Extensions).
2. In any app, select the sentence `If you finish early, give me a call.`
3. Trigger the `Analyze Text` command.
Expected: a Detail view shows the 🗣️ header, the quoted sentence, an aligned **Stress & Intonation** block (FIN·ish / EAR·ly / GIVE / CALL with ●/· marks and ↗ … ↘), the IPA line, a **Rhythm** block, and a coaching note.
4. Press ⌘P → it re-analyzes with Qwen (add the Qwen key first; if absent you should get the "Missing qwen API key → Open Preferences" toast).
5. Select a single word (e.g. `serendipity`) and run → it should show a generated example sentence with a "New Example Sentence" (⌘D) action.
6. Trigger with nothing selected → the manual input Form appears.

**Verify alignment:** confirm the mark line sits directly above the word line. If any glyph (●, ↗, ↘, ‖) is offset, edit `src/render/symbols.ts` to an ASCII fallback (e.g. STRESS `"^"`, WEAK `"."`, RISE `"/"`, FALL `"\\"`, GROUP `"|"`) and re-check.

- [ ] **Step 4: Commit**

```bash
git add src/analyze-text.tsx
git commit -m "feat: wire selection → analyze → Detail (Milestone 1: analysis works)"
```

---

## PHASE 2 — TTS playback (ends at Milestone 2: play / slow / repeat)

### Task 14: TTS types, config, and instruction builder

**Files:**
- Create: `src/tts/types.ts`, `src/tts/index.ts`
- Test: `tests/tts/index.test.ts`

- [ ] **Step 1: Write `src/tts/types.ts`**

```ts
import type { ProviderName, RawPrefs } from "../llm/config";

export interface TtsConfig {
  provider: ProviderName;
  apiKey: string;
  voice: string;
  model: string;
  baseURL?: string; // qwen only
}

export interface SynthesizeOptions {
  slow: boolean;
  instructions: string;
}

export interface TtsPrefs extends RawPrefs {
  openaiTtsVoice?: string;
  qwenTtsVoice?: string;
  ttsProvider?: "follow-analysis" | "openai" | "qwen";
  slowRate?: string;
}
```

- [ ] **Step 2: Write `src/tts/index.ts`**

```ts
import type { ProviderName } from "../llm/config";
import { MissingKeyError, QWEN_BASE } from "../llm/config";
import type { TtsConfig, TtsPrefs } from "./types";

export function resolveTtsProvider(analysisProvider: ProviderName, prefs: TtsPrefs): ProviderName {
  const choice = prefs.ttsProvider || "follow-analysis";
  return choice === "follow-analysis" ? analysisProvider : choice;
}

export function resolveTtsConfig(provider: ProviderName, prefs: TtsPrefs): TtsConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return { provider, apiKey: prefs.openaiApiKey, voice: prefs.openaiTtsVoice || "alloy", model: "gpt-4o-mini-tts" };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  const base = QWEN_BASE[region].replace("/compatible-mode/v1", "/api/v1");
  return {
    provider,
    apiKey: prefs.qwenApiKey,
    voice: prefs.qwenTtsVoice || "Cherry",
    model: "qwen3-tts-flash",
    baseURL: base,
  };
}

export function buildTtsInstructions(slow: boolean, slowRate: string): string {
  const base =
    "Read this English sentence as a clear pronunciation model with a General American accent. Emphasize the stressed words, use natural rising and falling intonation, and pause briefly at commas.";
  if (!slow) return base;
  const rate = Number(slowRate) || 0.6;
  const pct = Math.round(rate * 100);
  return `${base} Speak slowly and deliberately, at about ${pct}% of normal speed, as a teaching example.`;
}
```

- [ ] **Step 3: Write the failing test `tests/tts/index.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { resolveTtsProvider, resolveTtsConfig, buildTtsInstructions } from "../../src/tts/index";

describe("resolveTtsProvider", () => {
  it("follows the analysis provider by default", () => {
    expect(resolveTtsProvider("qwen", {})).toBe("qwen");
  });
  it("honors an explicit override", () => {
    expect(resolveTtsProvider("qwen", { ttsProvider: "openai" })).toBe("openai");
  });
});

describe("resolveTtsConfig", () => {
  it("uses gpt-4o-mini-tts for OpenAI", () => {
    const c = resolveTtsConfig("openai", { openaiApiKey: "sk", openaiTtsVoice: "nova" });
    expect(c.model).toBe("gpt-4o-mini-tts");
    expect(c.voice).toBe("nova");
  });
  it("uses the DashScope /api/v1 base for Qwen", () => {
    const c = resolveTtsConfig("qwen", { qwenApiKey: "sk", qwenRegion: "beijing" });
    expect(c.baseURL).toBe("https://dashscope.aliyuncs.com/api/v1");
    expect(c.model).toBe("qwen3-tts-flash");
  });
});

describe("buildTtsInstructions", () => {
  it("adds a slow-pace clause only when slow", () => {
    expect(buildTtsInstructions(false, "0.6")).not.toMatch(/slowly/);
    expect(buildTtsInstructions(true, "0.5")).toContain("50%");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/tts/index.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/tts/types.ts src/tts/index.ts tests/tts/index.test.ts
git commit -m "feat: add TTS config resolution and instruction builder"
```

---

### Task 15: Audio playback + cache

**Files:**
- Create: `src/tts/playback.ts`
- Test: `tests/tts/playback.test.ts`

- [ ] **Step 1: Write `src/tts/playback.ts`**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const execFileP = promisify(execFile);
const CACHE_DIR = join(tmpdir(), "raycast-speaking-coach-audio");

export function audioCacheKey(parts: { text: string; provider: string; voice: string; slow: boolean }): string {
  return createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

export function cachedAudioPath(key: string, ext: string): string | null {
  const p = join(CACHE_DIR, `${key}.${ext}`);
  return existsSync(p) ? p : null;
}

export async function writeAudioCache(key: string, ext: string, bytes: Buffer): Promise<string> {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
  const p = join(CACHE_DIR, `${key}.${ext}`);
  await writeFile(p, bytes);
  return p;
}

export async function playAudio(path: string, exec: typeof execFileP = execFileP): Promise<void> {
  await exec("afplay", [path]);
}
```

- [ ] **Step 2: Write the failing test `tests/tts/playback.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { audioCacheKey, playAudio } from "../../src/tts/playback";

describe("audioCacheKey", () => {
  it("is deterministic and sensitive to slow flag", () => {
    const a = audioCacheKey({ text: "hi", provider: "openai", voice: "alloy", slow: false });
    const b = audioCacheKey({ text: "hi", provider: "openai", voice: "alloy", slow: false });
    const c = audioCacheKey({ text: "hi", provider: "openai", voice: "alloy", slow: true });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("playAudio", () => {
  it("invokes afplay with the file path", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await playAudio("/tmp/x.wav", exec as never);
    expect(exec).toHaveBeenCalledWith("afplay", ["/tmp/x.wav"]);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/tts/playback.test.ts`
Expected: PASS (2).

- [ ] **Step 4: Commit**

```bash
git add src/tts/playback.ts tests/tts/playback.test.ts
git commit -m "feat: add afplay playback and on-disk audio cache"
```

---

### Task 16: OpenAI TTS adapter

**Files:**
- Create: `src/tts/openai.ts`
- Test: `tests/tts/openai.test.ts`

- [ ] **Step 1: Write `src/tts/openai.ts`**

```ts
import type { TtsConfig, SynthesizeOptions } from "./types";

export class TtsError extends Error {}

export interface SynthResult {
  bytes: Buffer;
  ext: string;
}

export async function synthesizeOpenAI(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const res = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      voice: cfg.voice,
      input: text,
      instructions: opts.instructions,
      response_format: "wav",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`OpenAI TTS ${res.status}: ${body.slice(0, 150)}`);
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), ext: "wav" };
}
```

- [ ] **Step 2: Write the failing test `tests/tts/openai.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { synthesizeOpenAI, TtsError } from "../../src/tts/openai";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = { provider: "openai", apiKey: "sk", voice: "alloy", model: "gpt-4o-mini-tts" };

describe("synthesizeOpenAI", () => {
  it("POSTs to /v1/audio/speech and returns wav bytes", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode("RIFFfake").buffer,
    })) as unknown as typeof fetch;
    const out = await synthesizeOpenAI("hello", { slow: false, instructions: "read clearly" }, cfg, fetchImpl);
    expect(out.ext).toBe("wav");
    expect(out.bytes.length).toBeGreaterThan(0);
    const [url, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(init.body).toContain("\"response_format\":\"wav\"");
    expect(init.body).toContain("read clearly");
  });
  it("throws TtsError on failure", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" })) as unknown as typeof fetch;
    await expect(synthesizeOpenAI("x", { slow: false, instructions: "" }, cfg, fetchImpl)).rejects.toBeInstanceOf(TtsError);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/tts/openai.test.ts`
Expected: PASS (2).

- [ ] **Step 4: Commit**

```bash
git add src/tts/openai.ts tests/tts/openai.test.ts
git commit -m "feat: add OpenAI TTS adapter"
```

---

### Task 17: Qwen TTS adapter

**Files:**
- Create: `src/tts/qwen.ts`
- Test: `tests/tts/qwen.test.ts`

- [ ] **Step 1: Confirm the request/response shape against the captured doc**

Run: `grep -nA30 "multimodal-generation/generation" .firecrawl/qwen-tts-nonrealtime.md | head -60`
Confirm the exact field names for: request body (`input.text`, `input.voice`, `language_type`/`languageType`, where `instructions` goes) and response (`output.audio.url` vs `output.audio.data`). Adjust the code in Step 2 to match the doc. The shape below is the expected DashScope `multimodal-generation` form; **verify before trusting it.**

- [ ] **Step 2: Write `src/tts/qwen.ts`**

```ts
import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

export async function synthesizeQwen(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base = cfg.baseURL ?? "https://dashscope.aliyuncs.com/api/v1";
  const model = opts.slow ? "qwen3-tts-instruct-flash" : cfg.model;
  const input: Record<string, unknown> = { text, voice: cfg.voice, language_type: "English" };
  if (opts.slow) input.instructions = opts.instructions;

  const res = await fetchImpl(`${base}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model, input }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`Qwen TTS ${res.status}: ${body.slice(0, 150)}`);
  }
  const data = (await res.json()) as { output?: { audio?: { url?: string; data?: string } } };
  const audio = data?.output?.audio;
  if (audio?.data) return { bytes: Buffer.from(audio.data, "base64"), ext: "wav" };
  if (audio?.url) {
    const a = await fetchImpl(audio.url);
    return { bytes: Buffer.from(await a.arrayBuffer()), ext: "wav" };
  }
  throw new TtsError("Qwen TTS: no audio in response");
}
```

- [ ] **Step 3: Write the failing test `tests/tts/qwen.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { synthesizeQwen } from "../../src/tts/qwen";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = { provider: "qwen", apiKey: "sk", voice: "Cherry", model: "qwen3-tts-flash", baseURL: "https://dashscope.aliyuncs.com/api/v1" };

describe("synthesizeQwen", () => {
  it("decodes base64 audio from the response", async () => {
    const b64 = Buffer.from("RIFFfake").toString("base64");
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ output: { audio: { data: b64 } } }) })) as unknown as typeof fetch;
    const out = await synthesizeQwen("hello", { slow: false, instructions: "" }, cfg, fetchImpl);
    expect(out.bytes.toString()).toBe("RIFFfake");
    const [url] = (fetchImpl as unknown as { mock: { calls: [string][] } }).mock.calls[0];
    expect(url).toContain("/services/aigc/multimodal-generation/generation");
  });
  it("downloads audio when only a URL is returned", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ output: { audio: { url: "https://x/a.wav" } } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode("AUDIO").buffer });
    const out = await synthesizeQwen("hi", { slow: false, instructions: "" }, cfg, fetchImpl as unknown as typeof fetch);
    expect(out.bytes.toString()).toBe("AUDIO");
  });
  it("switches to the instruct model when slow", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ output: { audio: { data: Buffer.from("x").toString("base64") } } }) })) as unknown as typeof fetch;
    await synthesizeQwen("hi", { slow: true, instructions: "speak slowly" }, cfg, fetchImpl);
    const [, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(init.body).toContain("qwen3-tts-instruct-flash");
    expect(init.body).toContain("speak slowly");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/tts/qwen.test.ts`
Expected: PASS (3). If the doc (Step 1) used different field names, update both `qwen.ts` and these tests together.

- [ ] **Step 5: Commit**

```bash
git add src/tts/qwen.ts tests/tts/qwen.test.ts
git commit -m "feat: add Qwen TTS adapter (non-realtime HTTP)"
```

---

### Task 18: Wire Play / Slow / Repeat into AnalysisDetail — MILESTONE 2

**Files:**
- Modify: `src/components/AnalysisDetail.tsx`
- Create: `src/tts/speak.ts` (orchestrates synth + cache + play; keeps the component thin)

- [ ] **Step 1: Create `src/tts/speak.ts`**

```ts
import type { ProviderName } from "../llm/config";
import type { TtsPrefs } from "./types";
import { resolveTtsProvider, resolveTtsConfig, buildTtsInstructions } from "./index";
import { synthesizeOpenAI } from "./openai";
import { synthesizeQwen } from "./qwen";
import { audioCacheKey, cachedAudioPath, writeAudioCache, playAudio } from "./playback";

let lastPlayedPath: string | null = null;

export async function speak(text: string, analysisProvider: ProviderName, prefs: TtsPrefs, slow: boolean): Promise<void> {
  const provider = resolveTtsProvider(analysisProvider, prefs);
  const cfg = resolveTtsConfig(provider, prefs);
  const key = audioCacheKey({ text, provider, voice: cfg.voice, slow });

  let path = cachedAudioPath(key, "wav");
  if (!path) {
    const opts = { slow, instructions: buildTtsInstructions(slow, prefs.slowRate || "0.6") };
    const result = provider === "openai" ? await synthesizeOpenAI(text, opts, cfg) : await synthesizeQwen(text, opts, cfg);
    path = await writeAudioCache(key, result.ext, result.bytes);
  }
  lastPlayedPath = path;
  await playAudio(path);
}

export async function repeatLast(): Promise<boolean> {
  if (!lastPlayedPath) return false;
  await playAudio(lastPlayedPath);
  return true;
}
```

- [ ] **Step 2: Modify `src/components/AnalysisDetail.tsx`** — add play actions

Add these props to `AnalysisDetailProps`:

```ts
  onPlay: () => void;
  onSlow: () => void;
  onRepeat: () => void;
```

Insert these actions as the FIRST items in the `<ActionPanel>` (before "Switch to …"), so Play is the default ↵ action:

```tsx
          <Action title="Play Example" icon={Icon.Play} onAction={props.onPlay} />
          <Action title="Play Slowly (0.6×)" icon={Icon.Gauge} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={props.onSlow} />
          <Action title="Repeat" icon={Icon.Repeat} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={props.onRepeat} />
```

- [ ] **Step 3: Modify `src/analyze-text.tsx`** — pass play handlers

Add imports:

```ts
import { speak, repeatLast } from "./tts/speak";
```

Add handlers inside `Command` (after `onNewExample`):

```ts
  const onPlay = useCallback(() => {
    if (analysis) {
      void showToast({ style: Toast.Style.Animated, title: "Speaking…" });
      void speak(analysis.text, provider, prefs, false).catch(reportError);
    }
  }, [analysis, provider, prefs]);

  const onSlow = useCallback(() => {
    if (analysis) {
      void showToast({ style: Toast.Style.Animated, title: "Speaking slowly…" });
      void speak(analysis.text, provider, prefs, true).catch(reportError);
    }
  }, [analysis, provider, prefs]);

  const onRepeat = useCallback(() => {
    void repeatLast().then((ok) => { if (!ok) void showToast({ style: Toast.Style.Failure, title: "Nothing to repeat yet" }); });
  }, []);
```

Pass them to `<AnalysisDetail … onPlay={onPlay} onSlow={onSlow} onRepeat={onRepeat} />`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx ray lint`
Expected: exit 0.

- [ ] **Step 5: Manual smoke test (Milestone 2)**

Run: `npm run dev`
1. Analyze `If you finish early, give me a call.`
2. Press ↵ (Play Example) → you hear a clear model reading.
3. Press ⌘S (Play Slowly) → a slower teaching reading.
4. Press ⌘R (Repeat) → replays the last audio with no new API call (instant).
5. Switch provider (⌘P) to Qwen and repeat Play/Slow → audio still plays (verify Qwen field names from Task 17 produced playable audio; if not, fix `qwen.ts` per the real response).

- [ ] **Step 6: Commit**

```bash
git add src/tts/speak.ts src/components/AnalysisDetail.tsx src/analyze-text.tsx
git commit -m "feat: add play/slow/repeat TTS actions (Milestone 2: speaking works)"
```

---

### Task 19: Final verification and cleanup

**Files:**
- Modify: `README.md` (create), any fixes surfaced by checks

- [ ] **Step 1: Full test + typecheck + lint**

Run: `npm test && npx tsc --noEmit && npx ray lint`
Expected: all tests pass; no type errors; no lint errors.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `ray build` completes; reports a valid extension.

- [ ] **Step 3: Write `README.md`** (short: what it does, required API keys, how to use, the visualization legend ● · ↗ ↘ ‖ ‿).

- [ ] **Step 4: Smoke checklist** — confirm end to end: selection analysis, manual-input fallback, single-word example generation, provider switch, play/slow/repeat, missing-key toasts.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README and finalize v1"
```

---

## Self-Review (completed during planning)

**Spec coverage:** ✅ visualization B+C (Tasks 3–4), structured-JSON approach (Tasks 2,6,8), OpenAI+Qwen analysis (Tasks 7–9), provider switch (Tasks 11,13), GA accent (prompt Task 6), TTS provider neural (Tasks 14,16,17), slow via instructions + cache (Tasks 14,15,18), repeat from cache (Tasks 15,18), afplay playback (Task 15), selection + manual entry (Tasks 12,13), single-word → example (Tasks 5,6,13), preferences (Task 1), error handling/toasts (Task 10), caching (Tasks 10,15), tests (every pure module), risks: Qwen field-name verification has an explicit step (Task 17 Step 1), glyph-width fallback documented (Task 13 Step 3).

**Out of scope (v2, per spec):** Gemini provider, Style-A SVG pitch curve, history/favorites, per-word playback, RP toggle, three-provider compare. Not planned here by design.

**Type consistency:** `ChatConfig` (client) reused by analyze/config; `TtsConfig`/`SynthesizeOptions`/`SynthResult` shared across tts adapters; `ProviderName` shared from `llm/config`; `renderAnalysis`, `analysisCacheKey`, `audioCacheKey`, `resolveAnalysisConfig`, `resolveTtsConfig`, `buildTtsInstructions`, `speak`/`repeatLast` names used consistently across tasks.

**Known verification gap (flagged, not a placeholder):** exact Qwen `multimodal-generation` request/response field names — Task 17 Step 1 reads the captured doc and adjusts code+tests together before relying on them.
