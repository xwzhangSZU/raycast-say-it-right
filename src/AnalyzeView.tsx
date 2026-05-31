import { showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ProsodyAnalysis } from "./types";
import {
  pickInitialProvider,
  PROVIDER_LABELS,
  type ProviderName,
} from "./llm/config";
import { analyze } from "./llm/analyze";
import { performAnalysis, type AnalysisIo } from "./llm/performAnalysis";
import { splitSentences } from "./lib/sentences";
import { resolveLoop } from "./lib/loop";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import { readAnalysisCache, writeAnalysisCache } from "./lib/cache";
import {
  AnalysisDetail,
  AnalysisPlaceholder,
} from "./components/AnalysisDetail";
import { speak, speakLoop, exportAudio, repeatLast } from "./tts/speak";

const ANALYSIS_IO: AnalysisIo = {
  analyze,
  readCache: readAnalysisCache,
  writeCache: writeAnalysisCache,
  reportError,
};

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
  // Providers the user has actually configured (a key is set). The switch
  // action cycles through these; falls back to all three if none configured.
  const availableProviders = useMemo<ProviderName[]>(() => {
    const list: ProviderName[] = [];
    if (prefs.openaiApiKey?.trim()) list.push("openai");
    if (prefs.qwenApiKey?.trim() || prefs.qwenAnalysisApiKey?.trim())
      list.push("qwen");
    if (prefs.geminiApiKey?.trim()) list.push("gemini");
    if (prefs.mimoApiKey?.trim()) list.push("mimo");
    return list.length > 0 ? list : ["openai", "qwen", "gemini", "mimo"];
  }, [prefs]);
  const [analysis, setAnalysis] = useState<ProsodyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Monotonic request id: only the latest in-flight analysis may mutate state,
  // so switching provider/sentence mid-flight can't let a stale result win.
  const genRef = useRef(0);

  const run = useCallback(
    async (input: string, prov: ProviderName, forceFresh = false) => {
      const myGen = ++genRef.current;
      await performAnalysis(input, prov, {
        prefs,
        forceFresh,
        isCurrent: () => myGen === genRef.current,
        sinks: { setLoading: setIsLoading, setFailed, setAnalysis },
        io: ANALYSIS_IO,
      });
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
    const { times, gapMs } = resolveLoop(prefs.loopCount, prefs.loopGap);
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
    setProvider((p) => {
      const i = availableProviders.indexOf(p);
      return availableProviders[(i + 1) % availableProviders.length];
    });
  }, [availableProviders]);
  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

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
      switchToLabel={nextProvider ? PROVIDER_LABELS[nextProvider] : undefined}
      onNewExample={analysis.isGeneratedExample ? onNewExample : undefined}
      onNext={sentences.length > 1 ? onNext : undefined}
      onPrev={sentences.length > 1 ? onPrev : undefined}
    />
  );
}
