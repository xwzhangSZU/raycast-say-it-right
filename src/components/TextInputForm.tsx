import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

export function TextInputForm(props: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Analyze"
            icon={Icon.Microphone}
            onSubmit={(values: { text: string }) => props.onSubmit(values.text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="English text"
        placeholder="Paste a word or sentence to practice…"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
