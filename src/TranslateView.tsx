import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableAnalysisProviders,
  pickInitialProvider,
  PROVIDER_LABELS,
  resolveAnalysisConfig,
  resolveAnalysisModel,
  type ProviderName,
} from "./llm/config";
import { PROVIDER_IDS } from "./llm/models";
import { resolveTranslationTarget, translateText } from "./llm/translate";
import { getPrefs } from "./lib/preferences";
import {
  readTranslationCache,
  translationCacheKey,
  writeTranslationCache,
} from "./lib/translation-cache";
import { reportError } from "./lib/errors";
import { renderTranslationMarkdown } from "./render/translation";

interface TranslationState {
  translation?: string;
  targetLanguageTitle?: string;
  isLoading?: boolean;
  failed?: boolean;
}

export function TranslateView({ text }: { text: string }) {
  const source = text.trim();
  const prefs = useMemo(() => getPrefs(), []);
  const [provider, setProvider] = useState<ProviderName>(
    pickInitialProvider(prefs),
  );
  const [state, setState] = useState<TranslationState>({ isLoading: true });
  const generationRef = useRef(0);

  const availableProviders = useMemo<ProviderName[]>(() => {
    const list = getAvailableAnalysisProviders(prefs);
    return list.length > 0 ? list : [...PROVIDER_IDS];
  }, [prefs]);

  const runTranslation = useCallback(
    async (forceFresh = false) => {
      const generation = ++generationRef.current;
      if (!source) {
        setState({ isLoading: false, failed: true });
        return;
      }

      const model = resolveAnalysisModel(provider, prefs);
      const target = resolveTranslationTarget(
        prefs.translationTargetLanguage,
        source,
      );
      const key = translationCacheKey({
        text: source,
        provider,
        model,
        targetLanguage: target.language,
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
        const cfg = resolveAnalysisConfig(provider, prefs);
        const result = await translateText(source, cfg, target.language);
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
    [prefs, provider, source],
  );

  useEffect(() => {
    void runTranslation();
  }, [runTranslation]);

  const onSwitchProvider = useCallback(() => {
    const i = availableProviders.indexOf(provider);
    const next = availableProviders[(i + 1) % availableProviders.length];
    setProvider(next);
    setState({ isLoading: true });
  }, [availableProviders, provider]);

  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

  const markdown = renderTranslationMarkdown(source, state);

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
          <Detail.Metadata.Label
            title="Target"
            text={state.targetLanguageTitle ?? "Auto"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Translation"
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
          {nextProvider ? (
            <Action
              title={`Switch to ${PROVIDER_LABELS[nextProvider]}`}
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={onSwitchProvider}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
