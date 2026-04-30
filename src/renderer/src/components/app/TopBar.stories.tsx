import type { Meta, StoryObj } from "@storybook/react-vite";
import { TopBar } from "./TopBar";

const meta: Meta<typeof TopBar> = {
  title: "App/TopBar",
  component: TopBar,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof TopBar>;

export const Empty: Story = { args: { isDark: true, sidebarVisible: true } };

export const WithDocument: Story = {
  args: {
    isDark: true,
    sidebarVisible: true,
    documentName: "codigo-civil-cc-09-02-2026.pdf",
  },
};

export const SidebarHidden: Story = {
  args: {
    isDark: true,
    sidebarVisible: false,
    documentName: "codigo-civil-cc-09-02-2026.pdf",
  },
};
