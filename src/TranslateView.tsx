import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableAnalysisProviders,
  PROVIDER_LABELS,
  resolveAnalysisConfig,
  resolveAnalysisModel,
  type ProviderName,
} from "./llm/config";
import { ANALYSIS_MODELS, PROVIDER_IDS } from "./llm/models";
import {
  resolveTranslationTarget,
  translateText,
  type TranslationPromptMode,
} from "./llm/translate";
import { getPrefs } from "./lib/preferences";
import {
  readTranslationCache,
  translationCacheKey,
  writeTranslationCache,
} from "./lib/translation-cache";
import { reportError } from "./lib/errors";
import { renderTranslationMarkdown } from "./render/translation";
import {
  applyAnalysisModel,
  initialAnalysisModels,
  initialAnalysisProvider,
  readRuntimeSelection,
  writeRuntimeSelection,
  type AnalysisModelMap,
  type RuntimeSelection,
} from "./lib/runtime-selection";

interface TranslationState {
  translation?: string;
  targetLanguageTitle?: string;
  isLoading?: boolean;
  failed?: boolean;
}

export function TranslateView({
  text,
  mode = "translate",
  title,
  sourceTitle,
}: {
  text: string;
  mode?: TranslationPromptMode;
  title?: string;
  sourceTitle?: string;
}) {
  const prefs = useMemo(() => getPrefs(), []);
  const [storedSelection, setStoredSelection] =
    useState<RuntimeSelection | null>(null);

  useEffect(() => {
    let mounted = true;
    void readRuntimeSelection().then((selection) => {
      if (mounted) setStoredSelection(selection);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (storedSelection === null) {
    return <Detail isLoading={true} markdown="# Translating…" />;
  }

  return (
    <TranslateViewInner
      text={text}
      mode={mode}
      title={title}
      sourceTitle={sourceTitle}
      prefs={prefs}
      storedSelection={storedSelection}
    />
  );
}

function TranslateViewInner({
  text,
  mode,
  title,
  sourceTitle,
  prefs,
  storedSelection,
}: {
  text: string;
  mode: TranslationPromptMode;
  title?: string;
  sourceTitle?: string;
  prefs: Preferences;
  storedSelection: RuntimeSelection;
}) {
  const source = text.trim();
  const [provider, setProvider] = useState<ProviderName>(
    initialAnalysisProvider(prefs, storedSelection),
  );
  const [analysisModels, setAnalysisModels] = useState<AnalysisModelMap>(() =>
    initialAnalysisModels(prefs, storedSelection),
  );
  const [state, setState] = useState<TranslationState>({ isLoading: true });
  const generationRef = useRef(0);

  const availableProviders = useMemo<ProviderName[]>(() => {
    const list = getAvailableAnalysisProviders(prefs);
    return list.length > 0 ? list : [...PROVIDER_IDS];
  }, [prefs]);
  const activePrefs = useMemo(
    () =>
      applyAnalysisModel(
        prefs,
        provider,
        analysisModels[provider] ?? resolveAnalysisModel(provider, prefs),
      ),
    [analysisModels, prefs, provider],
  );
  const analysisModel = resolveAnalysisModel(provider, activePrefs);
  const persistSelection = useCallback(
    (next: {
      analysisProvider?: ProviderName;
      analysisModels?: AnalysisModelMap;
    }) => {
      writeRuntimeSelection({
        analysisProvider: provider,
        analysisModels,
        ...next,
      });
    },
    [analysisModels, provider],
  );

  const runTranslation = useCallback(
    async (forceFresh = false) => {
      const generation = ++generationRef.current;
      if (!source) {
        setState({ isLoading: false, failed: true });
        return;
      }

      const model = resolveAnalysisModel(provider, activePrefs);
      const target = resolveTranslationTarget(
        prefs.translationTargetLanguage,
        source,
      );
      const key = translationCacheKey({
        text: source,
        provider,
        model,
        targetLanguage: target.language,
        promptMode: mode === "express-intent" ? mode : undefined,
      });

      setState({
        isLoading: true,
        failed: false,
        targetLanguageTitle: target.title,
      });

      const cached = forceFresh ? null : readTranslationCache(key);
      if (cached) {
        if (generation === generationRef.current) {
          setState({ ...cached, isLoading: false });
        }
        return;
      }

      try {
        const cfg = resolveAnalysisConfig(provider, activePrefs);
        const result = await translateText(source, cfg, {
          preferredLanguage: target.language,
          mode,
        });
        writeTranslationCache(key, result);
        if (generation === generationRef.current) {
          setState({ ...result, isLoading: false });
        }
      } catch (err) {
        if (generation === generationRef.current) {
          setState({
            isLoading: false,
            failed: true,
            targetLanguageTitle: target.title,
          });
        }
        await reportError(err);
      }
    },
    [activePrefs, mode, prefs.translationTargetLanguage, provider, source],
  );

  useEffect(() => {
    void runTranslation();
  }, [runTranslation]);

  const selectProvider = useCallback(
    (next: ProviderName) => {
      setProvider(next);
      setState({ isLoading: true });
      persistSelection({ analysisProvider: next });
    },
    [persistSelection],
  );

  const selectAnalysisModel = useCallback(
    (model: string) => {
      const nextModels = { ...analysisModels, [provider]: model };
      setAnalysisModels(nextModels);
      setState({ isLoading: true });
      persistSelection({ analysisModels: nextModels });
    },
    [analysisModels, persistSelection, provider],
  );

  const onSwitchProvider = useCallback(() => {
    const i = availableProviders.indexOf(provider);
    const next = availableProviders[(i + 1) % availableProviders.length];
    selectProvider(next);
  }, [availableProviders, provider, selectProvider]);

  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

  const markdown = renderTranslationMarkdown(source, state, {
    title:
      title ??
      (mode === "express-intent" ? "Natural Expression" : "Translation"),
    sourceTitle:
      sourceTitle ?? (mode === "express-intent" ? "Intent" : "Source"),
    emptyLabel:
      mode === "express-intent"
        ? "Could not express this intent. Use Refresh Translation to try again."
        : undefined,
  });

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Provider"
            text={PROVIDER_LABELS[provider]}
          />
          <Detail.Metadata.Label title="Model" text={analysisModel} />
          <Detail.Metadata.Label
            title="Target"
            text={state.targetLanguageTitle ?? "Auto"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Translation">
            <Action.CopyToClipboard
              title={
                mode === "express-intent"
                  ? "Copy Expression"
                  : "Copy Translation"
              }
              content={state.translation ?? ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Source"
              content={source}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Refresh Translation"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => void runTranslation(true)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Provider & Model">
            <ActionPanel.Submenu
              title="Choose Translation Provider"
              icon={Icon.Switch}
            >
              {availableProviders.map((value) => (
                <Action
                  key={value}
                  title={PROVIDER_LABELS[value]}
                  icon={value === provider ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => selectProvider(value)}
                />
              ))}
            </ActionPanel.Submenu>
            {ANALYSIS_MODELS[provider].length > 1 ? (
              <ActionPanel.Submenu
                title="Choose Translation Model"
                icon={Icon.Text}
              >
                {ANALYSIS_MODELS[provider].map((option) => (
                  <Action
                    key={option.id}
                    title={option.title}
                    icon={
                      option.id === analysisModel
                        ? Icon.CheckCircle
                        : Icon.Circle
                    }
                    onAction={() => selectAnalysisModel(option.id)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {nextProvider ? (
              <Action
                title={`Switch Provider to ${PROVIDER_LABELS[nextProvider]}`}
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={onSwitchProvider}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
