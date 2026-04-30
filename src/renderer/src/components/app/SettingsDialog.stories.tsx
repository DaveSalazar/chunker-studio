import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsDialog } from "./SettingsDialog";
import { Button } from "@/components/ui/Button";
import { ThemeProvider } from "@/lib/theme";
import { LocaleProvider } from "@/lib/i18n";

const meta: Meta<typeof SettingsDialog> = {
  title: "App/SettingsDialog",
  component: SettingsDialog,
  decorators: [
    (Story) => (
      <ThemeProvider initial="dark">
        <LocaleProvider initial="en">
          <Story />
        </LocaleProvider>
      </ThemeProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SettingsDialog>;

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open settings</Button>
        <SettingsDialog open={open} onOpenChange={setOpen} />
      </>
    );
  },
};

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Re-open</Button>
        <SettingsDialog open={open} onOpenChange={setOpen} />
      </>
    );
  },
};

export const StartsInSpanish: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider initial="dark">
        <LocaleProvider initial="es">
          <Story />
        </LocaleProvider>
      </ThemeProvider>
    ),
  ],
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Re-open</Button>
        <SettingsDialog open={open} onOpenChange={setOpen} />
      </>
    );
  },
};
