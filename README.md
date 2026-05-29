# Say It Right

**Turn any English text into a pronunciation lesson.** Select a sentence anywhere on your Mac and Say It Right shows you exactly *how to say it* — which words to stress, where your pitch should rise and fall, the rhythm, and the connected‑speech links — then reads it aloud as a clear model you can slow down, loop, and shadow.

Made for non‑native speakers, presenters, and anyone who wants their spoken English to sound natural.

## Why it's different

Most tools either read text aloud flatly or drill isolated words. Say It Right tackles what learners actually struggle with — **the melody of a whole sentence.** It maps the *up‑and‑down* of English (sentence stress, rising/falling intonation, thought‑group pauses, rhythm) onto the words themselves, then gives you a model voice to imitate. No file to import, no setup ritual: highlight text, get a lesson.

## Features

- **Prosody, visualized.** A monospace "stave" places the marks right above the words: stressed syllables (`●`), reduced syllables (`·`), the rising/falling tone (`↗` `↘`) on each thought group, pauses (`‖`), and connected‑speech links (`‿`) — with General American IPA.
- **Model reading via neural TTS** — a clear, natural voice (OpenAI or Qwen).
- **Practice controls built for how you actually learn:**
  - Play at normal, **0.75×**, or **0.5×** — slowed without the chipmunk/pitch shift.
  - **Shadowing Loop** auto‑repeats the line N times with a gap, so you can speak along.
  - **Save the model audio** to Downloads for offline practice.
  - **Step through long passages** sentence by sentence.
- **Select one word → get an example.** It writes a natural sentence using that word and coaches it.
- **Bring your own provider — either works.** Add an OpenAI **or** a Qwen (Alibaba DashScope) key; whichever you have is used automatically. Switch on the fly to compare voices and analyses.

## Commands

- **Analyze Selection** — highlight English text in any app, trigger the command (pairs nicely with a global hotkey), and see how to say it.
- **Practice a Sentence** — type or paste a line directly.

Both open the same coaching view, with every action available in the `⌘K` action panel:

| Action | Shortcut |
| --- | --- |
| Play | `↵` |
| Play slow `0.75×` / slower `0.5×` | `⌘S` / `⌘⇧S` |
| Shadowing loop | `⌘⇧L` |
| Repeat last | `⌘R` |
| Next / previous sentence | `⌘⇧N` / `⌘⇧P` |
| Save model audio | `⌘⇧E` |
| Switch provider | `⌘⇧O` |

## Setup

Open the extension's preferences and add **at least one** API key:

- **OpenAI** — analysis (`gpt-4o-mini`) and speech (`gpt-4o-mini-tts`).
- **Qwen / Alibaba DashScope** — analysis (`qwen3.6-flash` → `qwen3.7-max`) and speech (`qwen3-tts-flash`). Set the **Beijing** or **International** region to match your key.

Whichever key you fill is used automatically; if you add both, choose a preferred default. You can also pick the TTS voice and the shadowing‑loop count and gap.

## Visualization legend

`●` stressed syllable · `·` unstressed · `↗` / `↘` rising / falling tone · `‖` thought‑group pause · `‿` linking · **UPPERCASE** = the stressed syllable of a content word (e.g. `FIN·ish`).

## Privacy

You bring your own API key. Keys are stored in Raycast's secure preferences and are sent only to the provider you choose. The text you analyze is sent to that provider to produce the analysis and the spoken audio — nothing else leaves your Mac, and there is no telemetry or account.

## Requirements

macOS (audio plays through the built‑in `afplay`).
