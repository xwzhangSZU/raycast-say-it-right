import { Detail, getSelectedText, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { TextInputForm } from "./components/TextInputForm";
import { TranslateView } from "./TranslateView";

export default function Command() {
  const [text, setText] = useState<string | null>(null);
  const [needsInput, setNeedsInput] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sel = (await getSelectedText())?.trim();
        if (sel) setText(sel);
        else setNeedsInput(true);
      } catch {
        setNeedsInput(true);
      }
    })();
  }, []);

  if (text) return <TranslateView text={text} />;
  if (needsInput) {
    return (
      <TextInputForm
        onSubmit={(t) => setText(t.trim())}
        submitTitle="Translate"
        submitIcon={Icon.SpeechBubble}
        title="Text"
        placeholder="Paste text to translate..."
      />
    );
  }
  return <Detail isLoading={true} markdown="# Translating..." />;
}
