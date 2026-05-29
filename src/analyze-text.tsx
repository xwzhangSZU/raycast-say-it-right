import { getSelectedText, showToast, Toast, Detail } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
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

function AnalysisPlaceholder({ isLoading }: { isLoading: boolean }) {
  return (
    <Detail
      isLoading={isLoading}
      markdown={"# 🗣️ Analyzing…\n\nReading your selection and asking the model."}
    />
  );
}

export default function Command() {
  const prefs = useMemo(() => getPrefs(), []);
  const [text, setText] = useState<string | null>(null);
  const [needsInput, setNeedsInput] = useState(false);
  const [analysis, setAnalysis] = useState<ProsodyAnalysis | null>(null);
  const [provider, setProvider] = useState<ProviderName>(prefs.defaultAnalysisProvider || "openai");
  const [isLoading, setIsLoading] = useState(true);

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
    return <AnalysisPlaceholder isLoading={isLoading} />;
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
