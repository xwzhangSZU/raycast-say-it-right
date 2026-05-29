import {
  getSelectedText,
  showToast,
  Toast,
  Detail,
  ActionPanel,
  Action,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { ProsodyAnalysis } from "./types";
import type { ProviderName } from "./llm/config";
import { resolveAnalysisConfig, pickInitialProvider } from "./llm/config";
import { analyze } from "./llm/analyze";
import { isSingleWord } from "./lib/detect";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import {
  analysisCacheKey,
  readAnalysisCache,
  writeAnalysisCache,
} from "./lib/cache";
import { AnalysisDetail } from "./components/AnalysisDetail";
import { TextInputForm } from "./components/TextInputForm";
import { speak, repeatLast } from "./tts/speak";

function AnalysisPlaceholder({
  isLoading,
  failed,
  onRetry,
}: {
  isLoading: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const markdown = failed
    ? "# Could not analyze\n\nSomething went wrong (see the toast). Press **⌘R** to retry."
    : "# 🗣️ Analyzing…\n\nReading your selection and asking the model.";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        failed && onRetry ? (
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRetry}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  const prefs = useMemo(() => getPrefs(), []);
  const [text, setText] = useState<string | null>(null);
  const [needsInput, setNeedsInput] = useState(false);
  const [analysis, setAnalysis] = useState<ProsodyAnalysis | null>(null);
  const [provider, setProvider] = useState<ProviderName>(
    pickInitialProvider(prefs),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sel = (await getSelectedText())?.trim();
        if (sel) setText(sel);
        else {
          setNeedsInput(true);
          setIsLoading(false);
        }
      } catch {
        setNeedsInput(true);
        setIsLoading(false);
      }
    })();
  }, []);

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
    if (text) void run(text, provider);
  }, [text, provider, run]);

  const onSwitchProvider = useCallback(() => {
    const next: ProviderName = provider === "openai" ? "qwen" : "openai";
    setProvider(next);
    void showToast({
      style: Toast.Style.Animated,
      title: `Re-analyzing with ${next}…`,
    });
  }, [provider]);

  const onNewExample = useCallback(() => {
    if (text) void run(text, provider, true);
  }, [text, provider, run]);

  const onPlay = useCallback(() => {
    if (!analysis) return;
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Speaking…",
      });
      try {
        await speak(analysis.text, provider, prefs, 1);
        toast.style = Toast.Style.Success;
        toast.title = "Played";
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [analysis, provider, prefs]);

  const onSlow = useCallback(() => {
    if (!analysis) return;
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Speaking slowly…",
      });
      try {
        await speak(analysis.text, provider, prefs, 0.75);
        toast.style = Toast.Style.Success;
        toast.title = "Played slowly";
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [analysis, provider, prefs]);

  const onRepeat = useCallback(() => {
    void repeatLast().then((ok) => {
      if (!ok)
        void showToast({
          style: Toast.Style.Failure,
          title: "Nothing to repeat yet",
        });
    });
  }, []);

  if (needsInput && !text) {
    return (
      <TextInputForm
        onSubmit={(t) => {
          setNeedsInput(false);
          setText(t.trim());
        }}
      />
    );
  }
  if (!analysis) {
    return (
      <AnalysisPlaceholder
        isLoading={isLoading}
        failed={failed}
        onRetry={() => {
          if (text) void run(text, provider, true);
        }}
      />
    );
  }
  return (
    <AnalysisDetail
      analysis={analysis}
      provider={provider}
      isLoading={isLoading}
      onSwitchProvider={onSwitchProvider}
      onNewExample={analysis.isGeneratedExample ? onNewExample : undefined}
      onPlay={onPlay}
      onSlow={onSlow}
      onRepeat={onRepeat}
    />
  );
}
