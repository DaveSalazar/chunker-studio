import { Database, FileText } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DialogSection } from "./DialogSection";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const meta: Meta<typeof DialogSection> = {
  title: "App/DialogSection",
  component: DialogSection,
};
export default meta;

type Story = StoryObj<typeof DialogSection>;

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <DialogSection
        icon={<Database className="h-4 w-4 text-primary" />}
        title="Database"
        description="Postgres connection string. Stored in plaintext under userData."
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="db">Connection URL</Label>
          <Input id="db" placeholder="postgres://localhost:5432/legal" />
        </div>
      </DialogSection>
    </div>
  ),
};

export const Stacked: Story = {
  render: () => (
    <div className="flex w-[480px] flex-col gap-6">
      <DialogSection
        icon={<Database className="h-4 w-4 text-primary" />}
        title="Database"
        description="Postgres connection string."
      >
        <Input placeholder="postgres://…" />
      </DialogSection>
      <DialogSection
        icon={<FileText className="h-4 w-4 text-primary" />}
        title="Schema profile"
        description="Pick which table the chunks should land in."
      >
        <Input placeholder="legal_references" />
      </DialogSection>
    </div>
  ),
};
