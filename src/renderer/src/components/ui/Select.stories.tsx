import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";
import { Label } from "./Label";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

export const SourceType: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="source">Source type</Label>
      <Select id="source" defaultValue="codigo">
        <optgroup label="Reference">
          <option value="codigo">Code</option>
          <option value="ley">Law</option>
          <option value="reglamento">Regulation</option>
          <option value="sentencia">Jurisprudence</option>
          <option value="constitucion">Constitution</option>
        </optgroup>
        <optgroup label="Templates">
          <option value="demanda">Lawsuit</option>
          <option value="contrato">Contract</option>
        </optgroup>
      </Select>
    </div>
  ),
};
