# Say It Right Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Analyze selected English text for stress, sentence prominence, intonation (rising/falling tones), rhythm, and connected-speech linking
- Stress & Intonation + Rhythm visualization with General American IPA
- Single word selected → generates a natural example sentence to practice
- Neural TTS model reading via OpenAI (`gpt-4o-mini-tts`) or Qwen (`qwen3-tts-flash`), with slow playback and instant repeat
- Switch analysis provider (OpenAI / Qwen) on the fly
- Manual text input fallback when nothing is selected
