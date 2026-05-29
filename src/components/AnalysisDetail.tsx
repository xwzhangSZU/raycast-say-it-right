import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { ProsodyAnalysis } from "../types";
import type { ProviderName } from "../llm/config";
import { renderAnalysis } from "../render/markdown";

export function AnalysisPlaceholder(props: {
  isLoading: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const markdown = props.failed
    ? "# Could not analyze\n\nSomething went wrong (see the toast). Press **⌘R** to retry."
    : "# 🗣️ Analyzing…\n\nReading your text and asking the model.";
  return (
    <Detail
      isLoading={props.isLoading}
      markdown={markdown}
      actions={
        props.failed && props.onRetry ? (
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={props.onRetry}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export interface AnalysisDetailProps {
  analysis: ProsodyAnalysis;
  provider: ProviderName;
  isLoading: boolean;
  sentenceIndex: number;
  sentenceTotal: number;
  onPlay: () => void;
  onSlow: () => void;
  onSlower: () => void;
  onLoop: () => void;
  onRepeat: () => void;
  onSave: () => void;
  onSwitchProvider: () => void;
  onNewExample?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function AnalysisDetail(props: AnalysisDetailProps) {
  const { analysis, provider, isLoading, sentenceIndex, sentenceTotal } = props;
  const markdown = renderAnalysis(analysis);
  const other: ProviderName = provider === "openai" ? "qwen" : "openai";
  const providerLabel = provider === "openai" ? "OpenAI" : "Qwen";
  const otherLabel = other === "openai" ? "OpenAI" : "Qwen";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Provider" text={providerLabel} />
          <Detail.Metadata.Label title="Accent" text="General American" />
          {sentenceTotal > 1 ? (
            <Detail.Metadata.Label
              title="Sentence"
              text={`${sentenceIndex + 1} / ${sentenceTotal}`}
            />
          ) : null}
          {analysis.isGeneratedExample && analysis.sourceWord ? (
            <Detail.Metadata.Label
              title="Example for"
              text={analysis.sourceWord}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action title="Play" icon={Icon.Play} onAction={props.onPlay} />
            <Action
              title="Play Slow (0.75×)"
              icon={Icon.Gauge}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={props.onSlow}
            />
            <Action
              title="Play Slower (0.5×)"
              icon={Icon.Gauge}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={props.onSlower}
            />
            <Action
              title="Shadowing Loop"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={props.onLoop}
            />
            <Action
              title="Repeat Last"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={props.onRepeat}
            />
          </ActionPanel.Section>
          {props.onNext || props.onPrev ? (
            <ActionPanel.Section title="Navigate">
              {props.onNext ? (
                <Action
                  title="Next Sentence"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  onAction={props.onNext}
                />
              ) : null}
              {props.onPrev ? (
                <Action
                  title="Previous Sentence"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={props.onPrev}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Tools">
            <Action
              title="Save Model Audio"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={props.onSave}
            />
            <Action
              title={`Switch to ${otherLabel}`}
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={props.onSwitchProvider}
            />
            {props.onNewExample ? (
              <Action
                title="New Example Sentence"
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={props.onNewExample}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Annotation"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy IPA"
              content={analysis.ipa}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
