import type { Meta, StoryObj } from "@storybook/react-vite";
import { ParseButton } from "./ParseButton";

const meta: Meta<typeof ParseButton> = {
  title: "App/ParseButton",
  component: ParseButton,
};
export default meta;

type Story = StoryObj<typeof ParseButton>;

const noop = () => {};

export const Idle: Story = {
  render: () => <ParseButton loading="unparsed" onParse={noop} />,
};

export const Parsing: Story = {
  render: () => <ParseButton loading="parsing" onParse={noop} />,
};

export const Chunking: Story = {
  render: () => <ParseButton loading="chunking" onParse={noop} />,
};

export const Errored: Story = {
  render: () => <ParseButton loading="error" onParse={noop} />,
};

export const Ready: Story = {
  render: () => (
    <div className="text-xs text-muted-foreground">
      <ParseButton loading="ready" onParse={noop} />
      <span>(renders nothing — doc is already parsed)</span>
    </div>
  ),
};
