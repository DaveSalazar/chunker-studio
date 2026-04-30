import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionsFields } from "./ConnectionsFields";

const meta: Meta<typeof ConnectionsFields> = {
  title: "App/ConnectionsFields",
  component: ConnectionsFields,
};
export default meta;

type Story = StoryObj<typeof ConnectionsFields>;

export const Empty: Story = {
  render: () => {
    const [openaiApiKey, setKey] = useState("");
    const [databaseUrl, setUrl] = useState("");
    const [ollamaUrl, setOllama] = useState("");
    return (
      <div className="flex w-[480px] flex-col gap-4">
        <ConnectionsFields
          openaiApiKey={openaiApiKey}
          databaseUrl={databaseUrl}
          ollamaUrl={ollamaUrl}
          onChangeOpenaiKey={setKey}
          onChangeDatabaseUrl={setUrl}
          onChangeOllamaUrl={setOllama}
        />
      </div>
    );
  },
};

export const Filled: Story = {
  render: () => {
    const [openaiApiKey, setKey] = useState("sk-•••••••••••••••");
    const [databaseUrl, setUrl] = useState("postgres://corpus:secret@db:5432/legal");
    const [ollamaUrl, setOllama] = useState("http://localhost:11434");
    return (
      <div className="flex w-[480px] flex-col gap-4">
        <ConnectionsFields
          openaiApiKey={openaiApiKey}
          databaseUrl={databaseUrl}
          ollamaUrl={ollamaUrl}
          onChangeOpenaiKey={setKey}
          onChangeDatabaseUrl={setUrl}
          onChangeOllamaUrl={setOllama}
        />
      </div>
    );
  },
};
