import { showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ProsodyAnalysis } from "./types";
import {
  getAvailableAnalysisProviders,
  pickInitialProvider,
  PROVIDER_LABELS,
  resolveAnalysisConfig,
  resolveAnalysisModel,
  type ProviderName,
} from "./llm/config";
import type { ChatConfig } from "./llm/client";
import { PROVIDER_IDS } from "./llm/models";
import { analyze } from "./llm/analyze";
import { resolveTranslationTarget, translateText } from "./llm/translate";
import type { PromptOptions } from "./llm/prompt";
import { isSingleWord } from "./lib/detect";
import { analysisCacheKey } from "./lib/cache-key";
import {
  readTranslationCache,
  translationCacheKey,
  writeTranslationCache,
} from "./lib/translation-cache";
import { splitSentences, resolveSentencesPerPage } from "./lib/sentences";
import { resolveLoop } from "./lib/loop";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import { readAnalysisCache, writeAnalysisCache } from "./lib/cache";
import {
  AnalysisDetail,
  AnalysisPlaceholder,
} from "./components/AnalysisDetail";
import { speak, speakLoop, exportAudio, repeatLast } from "./tts/speak";

interface AnalysisRecord {
  analysis?: ProsodyAnalysis;
  isLoading?: boolean;
  failed?: boolean;
}

type AnalysisRecords = Record<number, AnalysisRecord | undefined>;

interface TranslationRecord {
  translation?: string;
  targetLanguage?: string;
  targetLanguageTitle?: string;
  isLoading?: boolean;
  failed?: boolean;
}

type TranslationRecords = Record<number, TranslationRecord | undefined>;

export function AnalyzeView({ text }: { text: string }) {
  const prefs = useMemo(() => getPrefs(), []);
  const sentences = useMemo(() => {
    const s = splitSentences(text);
    return s.length > 0 ? s : [text.trim()];
  }, [text]);
  const pageSize = useMemo(
    () => resolveSentencesPerPage(prefs.sentencesPerPage),
    [prefs.sentencesPerPage],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [provider, setProvider] = useState<ProviderName>(
    pickInitialProvider(prefs),
  );
  const [records, setRecords] = useState<AnalysisRecords>({});
  const [translations, setTranslations] = useState<TranslationRecords>({});
  const genRef = useRef(0);
  const translationGenRef = useRef(0);

  const current = sentences[Math.min(activeIndex, sentences.length - 1)];
  const pageEnd = Math.min(pageStart + pageSize, sentences.length);
  const pageIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (let i = pageStart; i < pageEnd; i++) indexes.push(i);
    return indexes;
  }, [pageEnd, pageStart]);

  // Providers the user has actually configured (a key is set). The switch
  // action cycles through these; falls back to the full catalog if none configured.
  const availableProviders = useMemo<ProviderName[]>(() => {
    const list = getAvailableAnalysisProviders(prefs);
    return list.length > 0 ? list : [...PROVIDER_IDS];
  }, [prefs]);

  const setRecord = useCallback((index: number, record: AnalysisRecord) => {
    setRecords((prev) => ({ ...prev, [index]: record }));
  }, []);

  const setTranslationRecord = useCallback(
    (index: number, record: TranslationRecord) => {
      setTranslations((prev) => ({ ...prev, [index]: record }));
    },
    [],
  );

  useEffect(() => {
    setPageStart((start) => Math.min(start, Math.max(sentences.length - 1, 0)));
    setActiveIndex((index) =>
      Math.min(index, Math.max(sentences.length - 1, 0)),
    );
  }, [sentences.length]);

  const analyzeOne = useCallback(
    async (index: number, cfg: ChatConfig, generation: number, key: string) => {
      const input = sentences[index];
      if (!input) return;

      try {
        const opts: PromptOptions = {
          isWord: isSingleWord(input),
          accent: "GA",
        };
        const result = await analyze(input, opts, cfg);
        writeAnalysisCache(key, result);
        if (generation === genRef.current) {
          setRecord(index, { analysis: result, isLoading: false });
        }
      } catch (err) {
        if (generation === genRef.current) {
          setRecord(index, { isLoading: false, failed: true });
        }
        await reportError(err);
      }
    },
    [sentences, setRecord],
  );

  const analyzeIndexes = useCallback(
    async (indexes: number[], prov: ProviderName, forceFresh = false) => {
      const generation = ++genRef.current;
      const model = resolveAnalysisModel(prov, prefs);
      const misses: { index: number; key: string }[] = [];

      for (const index of indexes) {
        const input = sentences[index];
        if (!input) continue;
        const key = analysisCacheKey(input, prov, "GA", model);
        setRecord(index, { isLoading: true, failed: false });
        const cached = forceFresh ? null : readAnalysisCache(key);
        if (cached) {
          if (generation === genRef.current) {
            setRecord(index, { analysis: cached, isLoading: false });
          }
        } else {
          misses.push({ index, key });
        }
      }

      if (misses.length === 0) return;

      let cfg: ChatConfig;
      try {
        cfg = resolveAnalysisConfig(prov, prefs);
      } catch (err) {
        misses.forEach(({ index }) =>
          setRecord(index, { isLoading: false, failed: true }),
        );
        await reportError(err);
        return;
      }

      for (const { index, key } of misses) {
        if (generation !== genRef.current) return;
        await analyzeOne(index, cfg, generation, key);
      }
    },
    [analyzeOne, prefs, sentences, setRecord],
  );

  useEffect(() => {
    void analyzeIndexes(pageIndexes, provider);
  }, [analyzeIndexes, pageIndexes, provider]);

  const translateIndexes = useCallback(
    async (indexes: number[], forceFresh = false) => {
      const generation = ++translationGenRef.current;
      const model = resolveAnalysisModel(provider, prefs);
      const misses: { index: number; key: string; targetLanguage: string }[] =
        [];

      for (const index of indexes) {
        const input = sentences[index];
        if (!input) continue;
        const target = resolveTranslationTarget(
          prefs.translationTargetLanguage,
          input,
        );
        const key = translationCacheKey({
          text: input,
          provider,
          model,
          targetLanguage: target.language,
        });
        setTranslationRecord(index, {
          isLoading: true,
          failed: false,
          targetLanguage: target.language,
          targetLanguageTitle: target.title,
        });
        const cached = forceFresh ? null : readTranslationCache(key);
        if (cached) {
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, {
              ...cached,
              isLoading: false,
            });
          }
        } else {
          misses.push({ index, key, targetLanguage: target.language });
        }
      }

      if (misses.length === 0) return;

      let cfg: ChatConfig;
      try {
        cfg = resolveAnalysisConfig(provider, prefs);
      } catch (err) {
        misses.forEach(({ index }) =>
          setTranslationRecord(index, { isLoading: false, failed: true }),
        );
        await reportError(err);
        return;
      }

      for (const { index, key, targetLanguage } of misses) {
        if (generation !== translationGenRef.current) return;
        const input = sentences[index];
        if (!input) continue;
        try {
          const result = await translateText(input, cfg, targetLanguage);
          writeTranslationCache(key, result);
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, {
              ...result,
              isLoading: false,
            });
          }
        } catch (err) {
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, { isLoading: false, failed: true });
          }
          await reportError(err);
        }
      }
    },
    [prefs, provider, sentences, setTranslationRecord],
  );

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

  const goToIndex = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(target, 0), sentences.length - 1);
      setActiveIndex(next);
      setPageStart(Math.floor(next / pageSize) * pageSize);
    },
    [pageSize, sentences.length],
  );

  const onSwitchProvider = useCallback(() => {
    const i = availableProviders.indexOf(provider);
    const next = availableProviders[(i + 1) % availableProviders.length];
    setProvider(next);
    setRecords({});
    setTranslations({});
    setPageStart(0);
    setActiveIndex(0);
  }, [availableProviders, provider]);

  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

  const onNewExample = useCallback(() => {
    void analyzeIndexes([activeIndex], provider, true);
  }, [activeIndex, analyzeIndexes, provider]);
  const onRetryCurrent = onNewExample;
  const onTranslateCurrent = useCallback(() => {
    void translateIndexes([activeIndex]);
  }, [activeIndex, translateIndexes]);
  const onTranslatePage = useCallback(() => {
    void translateIndexes(pageIndexes);
  }, [pageIndexes, translateIndexes]);

  const onNextSentence = useCallback(
    () => goToIndex(activeIndex + 1),
    [activeIndex, goToIndex],
  );
  const onPrevSentence = useCallback(
    () => goToIndex(activeIndex - 1),
    [activeIndex, goToIndex],
  );
  const onNextPage = useCallback(() => {
    const next = Math.min(pageStart + pageSize, sentences.length - 1);
    goToIndex(next);
  }, [goToIndex, pageSize, pageStart, sentences.length]);
  const onPrevPage = useCallback(() => {
    goToIndex(Math.max(pageStart - pageSize, 0));
  }, [goToIndex, pageSize, pageStart]);

  const items = useMemo(
    () =>
      pageIndexes.map((index) => ({
        index,
        text: sentences[index],
        analysis: records[index]?.analysis,
        isLoading: records[index]?.isLoading,
        failed: records[index]?.failed,
        translation: translations[index]?.translation,
        translationTarget: translations[index]?.targetLanguageTitle,
        translationLoading: translations[index]?.isLoading,
        translationFailed: translations[index]?.failed,
      })),
    [pageIndexes, records, sentences, translations],
  );

  if (sentences.length === 0 || !current) {
    return <AnalysisPlaceholder isLoading={false} failed />;
  }

  const anyLoading = items.some((item) => item.isLoading);
  const activeRecord = records[activeIndex];
  const activeTranslation = translations[activeIndex]?.translation;

  return (
    <AnalysisDetail
      items={items}
      provider={provider}
      isLoading={anyLoading}
      activeIndex={activeIndex}
      sentenceTotal={sentences.length}
      pageStart={pageStart}
      pageEnd={pageEnd}
      onPlay={() => speakAt(1, "Speaking…")}
      onSlow={() => speakAt(0.75, "Speaking slowly…")}
      onSlower={() => speakAt(0.5, "Speaking slower…")}
      onLoop={onLoop}
      onRepeat={onRepeat}
      onSave={onSave}
      onSwitchProvider={onSwitchProvider}
      switchToLabel={nextProvider ? PROVIDER_LABELS[nextProvider] : undefined}
      onRetryCurrent={onRetryCurrent}
      onTranslateCurrent={onTranslateCurrent}
      onTranslatePage={onTranslatePage}
      activeTranslation={activeTranslation}
      onNewExample={
        activeRecord?.analysis?.isGeneratedExample ? onNewExample : undefined
      }
      onSelectSentence={goToIndex}
      onNextSentence={
        activeIndex < sentences.length - 1 ? onNextSentence : undefined
      }
      onPrevSentence={activeIndex > 0 ? onPrevSentence : undefined}
      onNextPage={pageEnd < sentences.length ? onNextPage : undefined}
      onPrevPage={pageStart > 0 ? onPrevPage : undefined}
    />
  );
}
