import { LocalStorage } from "@raycast/api";
import {
  getAvailableAnalysisProviders,
  pickInitialProvider,
  resolveAnalysisModel,
  type ProviderName,
  type TtsProviderName,
} from "../llm/config";
import {
  ANALYSIS_MODELS,
  DEFAULT_TTS_MODELS,
  PROVIDER_IDS,
  TTS_MODELS,
  TTS_PROVIDER_IDS,
  isProviderName,
  isTtsProviderName,
  knownModelOrDefault,
} from "../llm/models";
import type { TtsPrefs } from "../tts/types";

const STORAGE_KEY = "runtime-model-selection-v1";

export type TtsProviderChoice = "follow-analysis" | TtsProviderName;
export type AnalysisModelMap = Partial<Record<ProviderName, string>>;
export type TtsModelMap = Partial<Record<TtsProviderName, string>>;

export interface RuntimeSelection {
  analysisProvider?: ProviderName;
  analysisModels?: AnalysisModelMap;
  ttsProvider?: TtsProviderChoice;
  ttsModels?: TtsModelMap;
}

export async function readRuntimeSelection(): Promise<RuntimeSelection> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return normalizeRuntimeSelection(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeRuntimeSelection(selection: RuntimeSelection): void {
  void LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeRuntimeSelection(selection)),
  );
}

export function initialAnalysisProvider(
  prefs: TtsPrefs & { defaultAnalysisProvider?: ProviderName },
  stored: RuntimeSelection,
): ProviderName {
  const available = getAvailableAnalysisProviders(prefs);
  if (
    stored.analysisProvider &&
    (available.length === 0 || available.includes(stored.analysisProvider))
  ) {
    return stored.analysisProvider;
  }
  return pickInitialProvider(prefs);
}

export function initialAnalysisModels(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): AnalysisModelMap {
  return Object.fromEntries(
    PROVIDER_IDS.map((provider) => [
      provider,
      knownModelOrDefault(
        stored.analysisModels?.[provider],
        ANALYSIS_MODELS[provider],
        resolveAnalysisModel(provider, prefs),
      ),
    ]),
  ) as AnalysisModelMap;
}

export function initialTtsProviderChoice(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): TtsProviderChoice {
  return stored.ttsProvider ?? prefs.ttsProvider ?? "follow-analysis";
}

export function initialTtsModels(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): TtsModelMap {
  return Object.fromEntries(
    TTS_PROVIDER_IDS.map((provider) => [
      provider,
      knownModelOrDefault(
        stored.ttsModels?.[provider],
        TTS_MODELS[provider],
        defaultTtsModel(provider, prefs),
      ),
    ]),
  ) as TtsModelMap;
}

export function applyAnalysisModel(
  prefs: TtsPrefs,
  provider: ProviderName,
  model: string,
): TtsPrefs {
  const next = { ...prefs };
  if (provider === "openai") next.openaiAnalysisModel = model;
  if (provider === "qwen") next.qwenAnalysisModel = model;
  if (provider === "gemini") next.geminiAnalysisModel = model;
  if (provider === "minimax") next.minimaxAnalysisModel = model;
  if (provider === "mimo") next.mimoAnalysisModel = model;
  return next;
}

export function applyTtsSelection(
  prefs: TtsPrefs,
  providerChoice: TtsProviderChoice,
  models: TtsModelMap,
): TtsPrefs {
  return {
    ...prefs,
    ttsProvider: providerChoice,
    openaiTtsModel: models.openai ?? prefs.openaiTtsModel,
    qwenTtsModel: models.qwen ?? prefs.qwenTtsModel,
    minimaxTtsModel: models.minimax ?? prefs.minimaxTtsModel,
    geminiTtsModel: models.gemini ?? prefs.geminiTtsModel,
    mimoTtsModel: models.mimo ?? prefs.mimoTtsModel,
  };
}

function defaultTtsModel(provider: TtsProviderName, prefs: TtsPrefs): string {
  if (provider === "openai") {
    return knownModelOrDefault(
      prefs.openaiTtsModel,
      TTS_MODELS.openai,
      DEFAULT_TTS_MODELS.openai,
    );
  }
  if (provider === "qwen") {
    return knownModelOrDefault(
      prefs.qwenTtsModel,
      TTS_MODELS.qwen,
      DEFAULT_TTS_MODELS.qwen,
    );
  }
  if (provider === "minimax") {
    return knownModelOrDefault(
      prefs.minimaxTtsModel,
      TTS_MODELS.minimax,
      DEFAULT_TTS_MODELS.minimax,
    );
  }
  if (provider === "gemini") {
    return knownModelOrDefault(
      prefs.geminiTtsModel,
      TTS_MODELS.gemini,
      DEFAULT_TTS_MODELS.gemini,
    );
  }
  return knownModelOrDefault(
    prefs.mimoTtsModel,
    TTS_MODELS.mimo,
    DEFAULT_TTS_MODELS.mimo,
  );
}

function normalizeRuntimeSelection(value: unknown): RuntimeSelection {
  const data = value as RuntimeSelection;
  const analysisModels: AnalysisModelMap = {};
  const ttsModels: TtsModelMap = {};

  for (const provider of PROVIDER_IDS) {
    const model = data.analysisModels?.[provider];
    if (
      typeof model === "string" &&
      ANALYSIS_MODELS[provider].some((option) => option.id === model)
    ) {
      analysisModels[provider] = model;
    }
  }

  for (const provider of TTS_PROVIDER_IDS) {
    const model = data.ttsModels?.[provider];
    if (
      typeof model === "string" &&
      TTS_MODELS[provider].some((option) => option.id === model)
    ) {
      ttsModels[provider] = model;
    }
  }

  return {
    analysisProvider:
      data.analysisProvider && isProviderName(data.analysisProvider)
        ? data.analysisProvider
        : undefined,
    analysisModels,
    ttsProvider:
      data.ttsProvider === "follow-analysis" ||
      (data.ttsProvider && isTtsProviderName(data.ttsProvider))
        ? data.ttsProvider
        : undefined,
    ttsModels,
  };
}
