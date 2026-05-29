import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { ProsodyAnalysis } from "../types";
import type { ProviderName } from "../llm/config";
import { renderAnalysis } from "../render/markdown";

export interface AnalysisDetailProps {
  analysis: ProsodyAnalysis;
  provider: ProviderName;
  isLoading: boolean;
  onSwitchProvider: () => void;
  onNewExample?: () => void;
  onPlay: () => void;
  onSlow: () => void;
  onRepeat: () => void;
}

export function AnalysisDetail(props: AnalysisDetailProps) {
  const { analysis, provider, isLoading } = props;
  const markdown = renderAnalysis(analysis);
  const other: ProviderName = provider === "openai" ? "qwen" : "openai";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Provider" text={provider} />
          <Detail.Metadata.Label title="Accent" text="General American" />
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
          <Action
            title="Play Example"
            icon={Icon.Play}
            onAction={props.onPlay}
          />
          <Action
            title="Play Slowly"
            icon={Icon.Gauge}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={props.onSlow}
          />
          <Action
            title="Repeat"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={props.onRepeat}
          />
          <Action
            title={`Switch to ${other}`}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={props.onSwitchProvider}
          />
          {props.onNewExample ? (
            <Action
              title="New Example Sentence"
              icon={Icon.Repeat}
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
        </ActionPanel>
      }
    />
  );
}
