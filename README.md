# Say It Right

**Turn any English text into a pronunciation lesson.** Select a sentence anywhere on your Mac and Say It Right shows you exactly _how to say it_ — which words to stress, where your pitch should rise and fall, the rhythm, and the connected‑speech links — then reads it aloud as a clear model you can slow down, loop, and shadow.

Made for non‑native speakers, presenters, and anyone who wants their spoken English to sound natural.

## Why it's different

Most tools either read text aloud flatly or drill isolated words. Say It Right tackles what learners actually struggle with — **the melody of a whole sentence.** It maps the _up‑and‑down_ of English (sentence stress, rising/falling intonation, thought‑group pauses, rhythm) onto the words themselves, then gives you a model voice to imitate. No file to import, no setup ritual: highlight text, get a lesson.

## Features

- **Prosody, visualized.** A monospace "stave" places the marks right above the words: stressed syllables (`●`), reduced syllables (`·`), the rising/falling tone (`↗` `↘`) on each thought group, pauses (`‖`), and connected‑speech links (`‿`) — with General American IPA.
- **Model reading via neural TTS** — a clear, natural voice from Qwen, MiniMax, MiMo, Gemini, or OpenAI.
- **Practice controls built for how you actually learn:**
  - Play at normal, **0.75×**, or **0.5×** — slowed without the chipmunk/pitch shift.
  - **Shadowing Loop** auto‑repeats the line N times with a gap, so you can speak along.
  - **Save the model audio** to Downloads for offline practice.
  - **Step through long passages** sentence by sentence.
  - **Page through long passages** in batches, with each sentence analyzed and cached as it becomes ready.
  - **Translate on demand** — translate the active sentence or the current page, with automatic Chinese ↔ English direction by default.
- **Select one word → get an example.** It writes a natural sentence using that word and coaches it.
- **Bring your own provider.** Add a Qwen, MiniMax, MiMo, Gemini, or OpenAI key; whichever you have is used automatically. Switch on the fly to compare voices and analyses.

## Commands

- **Analyze Selection** — highlight English text in any app, trigger the command (pairs nicely with a global hotkey), and see how to say it.
- **Practice a Sentence** — type or paste a line directly.
- **Translate Selection** — highlight or paste text and get a meaning-first translation using the same provider setup and translation cache.

The coaching commands open the same practice view, with every action available in the `⌘K` action panel:

| Action                            | Shortcut      |
| --------------------------------- | ------------- |
| Play                              | `↵`           |
| Play slow `0.75×` / slower `0.5×` | `⌘S` / `⌘⇧S`  |
| Shadowing loop                    | `⌘⇧L`         |
| Repeat last                       | `⌘R`          |
| Next / previous sentence          | `⌘⇧N` / `⌘⇧P` |
| Save model audio                  | `⌘⇧E`         |
| Switch provider                   | `⌘⇧O`         |
| Translate sentence / page         | `⌘T` / `⌘⇧T`  |

## Setup

Open the extension's preferences and add **at least one** API key:

- **Qwen Token Plan + DashScope** — analysis (`qwen3.6-flash`, `qwen3.6-plus`) uses the Token Plan Anthropic base URL (`https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic` by default). Speech (`qwen3-tts-flash`, `qwen3-tts-instruct-flash`) uses a separate DashScope key and region.
- **MiniMax** — analysis (`MiniMax-M2.7-highspeed`) through the Token Plan Anthropic endpoint (`https://api.minimaxi.com/anthropic`) and speech (`speech-2.8-turbo`, `speech-2.8-hd`).
- **MiMo / Xiaomi** — analysis (`mimo-v2.5`, `mimo-v2.5-pro`) and speech (`mimo-v2.5-tts`).
- **Gemini** — analysis (`gemini-3.5-flash`) and speech (`gemini-3.1-flash-tts-preview`).
- **OpenAI** — analysis (`gpt-5.5`) and speech (`gpt-4o-mini-tts`).

Whichever key you fill is used automatically; if you add several, choose a preferred default. You can also pick per-provider analysis models, TTS models, voices, translation target, sentences per page, and the shadowing‑loop count and gap.

## Visualization legend

`●` stressed syllable · `·` unstressed · `↗` / `↘` rising / falling tone · `‖` thought‑group pause · `‿` linking · **UPPERCASE** = the stressed syllable of a content word (e.g. `FIN·ish`).

## Privacy

You bring your own API key. Keys are stored in Raycast's secure preferences and are sent only to the provider you choose. The text you analyze is sent to that provider to produce the analysis and the spoken audio — nothing else leaves your Mac, and there is no telemetry or account.

## Requirements

macOS (audio plays through the built‑in `afplay`).
