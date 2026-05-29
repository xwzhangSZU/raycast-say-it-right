import { showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { ProsodyAnalysis } from "./types";
import type { ProviderName } from "./llm/config";
import { resolveAnalysisConfig, pickInitialProvider } from "./llm/config";
import { analyze } from "./llm/analyze";
import { isSingleWord } from "./lib/detect";
import { splitSentences } from "./lib/sentences";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import {
  analysisCacheKey,
  readAnalysisCache,
  writeAnalysisCache,
} from "./lib/cache";
import {
  AnalysisDetail,
  AnalysisPlaceholder,
} from "./components/AnalysisDetail";
import { speak, speakLoop, exportAudio, repeatLast } from "./tts/speak";

export function AnalyzeView({ text }: { text: string }) {
  const prefs = useMemo(() => getPrefs(), []);
  const sentences = useMemo(() => {
    const s = splitSentences(text);
    return s.length > 0 ? s : [text.trim()];
  }, [text]);
  const [index, setIndex] = useState(0);
  const current = sentences[Math.min(index, sentences.length - 1)];
  const [provider, setProvider] = useState<ProviderName>(
    pickInitialProvider(prefs),
  );
  const [analysis, setAnalysis] = useState<ProsodyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const run = useCallback(
    async (input: string, prov: ProviderName, forceFresh = false) => {
      setIsLoading(true);
      setFailed(false);
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
        setFailed(true);
        await reportError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [prefs],
  );

  useEffect(() => {
    void run(current, provider);
  }, [current, provider, run]);

  const speakAt = useCallback(
    (rate: number, label: string) => {
      void (async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: label,
        });
        try {
          await speak(current, provider, prefs, rate);
          toast.style = Toast.Style.Success;
          toast.title = "Played";
        } catch (err) {
          await reportError(err);
        }
      })();
    },
    [current, provider, prefs],
  );

  const onLoop = useCallback(() => {
    const times = Number(prefs.loopCount) || 3;
    const gapMs = (Number(prefs.loopGap) || 1) * 1000;
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Shadowing ×${times}…`,
      });
      try {
        await speakLoop(current, provider, prefs, times, gapMs);
        toast.style = Toast.Style.Success;
        toast.title = "Done";
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [current, provider, prefs]);

  const onRepeat = useCallback(() => {
    void repeatLast().then((ok) => {
      if (!ok)
        void showToast({
          style: Toast.Style.Failure,
          title: "Nothing to repeat yet",
        });
    });
  }, []);

  const onSave = useCallback(() => {
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving audio…",
      });
      try {
        const dest = await exportAudio(current, provider, prefs);
        toast.style = Toast.Style.Success;
        toast.title = "Saved to Downloads";
        toast.message = dest;
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [current, provider, prefs]);

  const onSwitchProvider = useCallback(() => {
    setProvider((p) => (p === "openai" ? "qwen" : "openai"));
  }, []);

  const onNewExample = useCallback(() => {
    void run(current, provider, true);
  }, [current, provider, run]);

  const onNext = useCallback(
    () => setIndex((i) => Math.min(i + 1, sentences.length - 1)),
    [sentences.length],
  );
  const onPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  if (!analysis) {
    return (
      <AnalysisPlaceholder
        isLoading={isLoading}
        failed={failed}
        onRetry={() => void run(current, provider, true)}
      />
    );
  }
  return (
    <AnalysisDetail
      analysis={analysis}
      provider={provider}
      isLoading={isLoading}
      sentenceIndex={index}
      sentenceTotal={sentences.length}
      onPlay={() => speakAt(1, "Speaking…")}
      onSlow={() => speakAt(0.75, "Speaking slowly…")}
      onSlower={() => speakAt(0.5, "Speaking slower…")}
      onLoop={onLoop}
      onRepeat={onRepeat}
      onSave={onSave}
      onSwitchProvider={onSwitchProvider}
      onNewExample={analysis.isGeneratedExample ? onNewExample : undefined}
      onNext={sentences.length > 1 ? onNext : undefined}
      onPrev={sentences.length > 1 ? onPrev : undefined}
    />
  );
}
