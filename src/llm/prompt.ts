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
          "nuclear": boolean,             // the tonic/nuclear word of its thought group (carries the tone); must be stressed
          "ipa"?: string,
          "linkToNext"?: "liaison"|"elision"|"intrusion"|null
        }
      ]
    }
  ],
  "notes"?: string                // ONE short coaching tip
}`;

const FIDELITY_RULES = `Accuracy requirements (do not violate):
- Analyze ONLY the exact words given, in their original order. Never add, drop, reorder, translate, or "fix" a word, even if it looks misspelled.
- Each word's "syllables" must spell that word exactly when concatenated (orthographic split, e.g. "finish" -> ["fin","ish"]). Do NOT put phonetic spellings in "syllables".
- Set "stressIndex" to the primary-stress syllable for that word per a standard General American dictionary; use null only for reduced function words.
- "ipa" is the whole sentence in General American IPA, wrapped in / /, using ˈ for primary and ˌ for secondary stress.
- Base stress and intonation on standard General American usage, not guesses. If a proper noun is uncertain, give your best standard approximation but keep the syllables faithful to the spelling.`;

const EXAMPLE_OUTPUT = `Example — for input "I'll call you." return exactly:
{"text":"I'll call you.","isGeneratedExample":false,"ipa":"/aɪl ˈkɔl ju/","thoughtGroups":[{"tone":"fall","words":[{"text":"I'll","syllables":["I'll"],"stressIndex":null,"stressed":false,"nuclear":false},{"text":"call","syllables":["call"],"stressIndex":0,"stressed":true,"nuclear":true},{"text":"you","syllables":["you"],"stressIndex":null,"stressed":false,"nuclear":false}]}]}`;

export function buildPrompt(
  text: string,
  opts: PromptOptions,
): { system: string; user: string } {
  const system = [
    "You are an expert English pronunciation coach specializing in General American prosody.",
    "Analyze the given English text for word stress, sentence stress, intonation (rising/falling tones per thought group), rhythm, and connected-speech linking.",
    "Rules: content words (nouns, main verbs, adjectives, adverbs, wh-words) are usually stressed; function words (articles, prepositions, auxiliaries, pronouns) are usually reduced. Each thought group has exactly one nuclear word, normally its last content word, and the nuclear word must be marked stressed. stressIndex must be a valid index into that word's syllables array. Use General American IPA.",
    FIDELITY_RULES,
    SCHEMA_HINT,
    EXAMPLE_OUTPUT,
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
