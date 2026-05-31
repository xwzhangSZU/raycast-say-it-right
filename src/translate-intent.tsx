import { Icon } from "@raycast/api";
import { useState } from "react";
import { TextInputForm } from "./components/TextInputForm";
import { TranslateView } from "./TranslateView";

export default function Command() {
  const [intent, setIntent] = useState<string | null>(null);

  if (intent) {
    return (
      <TranslateView
        text={intent}
        mode="express-intent"
        title="Translation"
        sourceTitle="What You Mean"
      />
    );
  }

  return (
    <TextInputForm
      onSubmit={(text) => setIntent(text.trim())}
      submitTitle="Translate"
      submitIcon={Icon.Message}
      title="What you mean"
      placeholder="用中文写下你想表达的意思..."
    />
  );
}
