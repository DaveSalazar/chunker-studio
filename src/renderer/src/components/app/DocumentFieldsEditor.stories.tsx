import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentFieldsEditor } from "./DocumentFieldsEditor";
import type { DocumentField } from "@shared/types";

const meta: Meta<typeof DocumentFieldsEditor> = {
  title: "App/DocumentFieldsEditor",
  component: DocumentFieldsEditor,
};
export default meta;

type Story = StoryObj<typeof DocumentFieldsEditor>;

const fields: DocumentField[] = [
  {
    key: "source",
    column: "source",
    label: "Source",
    kind: "text",
    required: true,
    isSourceKey: true,
  },
  {
    key: "sourceType",
    column: "source_type",
    label: "Source type",
    kind: "select",
    required: true,
    options: [
      { value: "codigo", label: "Código" },
      { value: "ley", label: "Ley" },
      { value: "reglamento", label: "Reglamento" },
    ],
  },
  {
    key: "version",
    column: "version_label",
    label: "Version label",
    kind: "text",
  },
];

export const Populated: Story = {
  render: () => {
    const [value, setValue] = useState<DocumentField[]>(fields);
    return (
      <div className="w-[520px]">
        <DocumentFieldsEditor fields={value} onChange={setValue} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <div className="w-[520px]">
      <DocumentFieldsEditor fields={[]} onChange={() => {}} />
    </div>
  ),
};
