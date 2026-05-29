# Say It Right (Raycast)

Analyze selected English text for **stress, intonation, rhythm, and linking**, see a clear text visualization, and hear a model reading via neural TTS (OpenAI or Qwen) — with slow playback and repeat.

## Features

- Select any English text, run **Analyze Text**, and get a Detail view showing:
  - **Stress & Intonation** — stress marks above each word, rising/falling tones on the nuclear word, thought-group breaks.
  - **IPA** (General American) plus connected-speech **linking** notes.
  - **Rhythm** — the stress-timed beat grid.
- Select a single **word** and it generates a natural example sentence to practice.
- **Play** the model reading (`↵`), **Play Slowly** (`⌘S`), **Repeat** the last audio with no extra API call (`⌘R`).
- **Switch analysis provider** on the fly (`⌘P`).
- No selection? A form lets you paste text manually.

## Setup

Open the extension preferences and set at least one provider's API key:

- **OpenAI** — API key (analysis + TTS). Analysis model `gpt-4o-mini` (configurable); TTS model `gpt-4o-mini-tts`.
- **Qwen (DashScope)** — API key + region (Beijing / International). Analysis model `qwen-flash` (configurable); TTS model `qwen3-tts-flash`.

Also configurable: default analysis provider, TTS provider (defaults to "follow analysis provider"), TTS voices, and slow playback rate.

## Visualization legend

- `●` stressed syllable · `·` unstressed
- `↗` rising · `↘` falling · `↗↘` / `↘↗` rise-fall / fall-rise · `→` level — shown on the nuclear (tonic) word
- `‖` thought-group boundary · `‿` linking (connected speech)
- UPPERCASE marks the stressed syllable of a content word (e.g. `FIN·ish`)

## Requirements

- **macOS** — audio plays through the built-in `afplay`.
- A registered **Raycast author handle** is required to run `ray develop` / `ray build`; set `author` in `package.json` to your Raycast username.

## Development

- `npm test` — unit tests (vitest)
- `npm run typecheck` — TypeScript check
- `npm run dev` — `ray develop`
- `npm run build` — `ray build`
