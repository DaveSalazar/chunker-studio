import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionsSection } from "./ConnectionsSection";
import type { AppConfig } from "@shared/types";

const meta: Meta<typeof ConnectionsSection> = {
  title: "App/ConnectionsSection",
  component: ConnectionsSection,
};
export default meta;

type Story = StoryObj<typeof ConnectionsSection>;

// ConnectionsSection reads/writes the on-disk config and tests the DB
// over IPC. Stub the bridge so the form mounts in Storybook.
function useChunkerStub(seed: AppConfig, testBehavior: "ok" | "fail" = "ok") {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stored: AppConfig = seed;
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      readConfig: async () => ({ ok: true, value: stored }),
      writeConfig: async (next: AppConfig) => {
        stored = next;
        return { ok: true, value: next };
      },
      testDatabase: async () =>
        testBehavior === "ok"
          ? {
              ok: true,
              value: {
                version: "PostgreSQL 16.2 on aarch64-apple-darwin",
                durationMs: 84,
              },
            }
          : { ok: false, error: "connect ECONNREFUSED 127.0.0.1:5432" },
    };
    setReady(true);
    return () => {
      (window as unknown as { chunker?: unknown }).chunker = original;
    };
  }, [seed, testBehavior]);
  return ready;
}

const filledSeed: AppConfig = {
  openaiApiKey: "sk-•••••••••",
  databaseUrl: "postgres://corpus:secret@db:5432/legal",
  ollamaUrl: "http://localhost:11434",
  profiles: [],
  defaultProfileId: null,
};

const emptySeed: AppConfig = {
  openaiApiKey: null,
  databaseUrl: null,
  ollamaUrl: null,
  profiles: [],
  defaultProfileId: null,
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[560px]">{children}</div>
);

export const Filled: Story = {
  render: () => {
    const ready = useChunkerStub(filledSeed);
    if (!ready) return <span />;
    return (
      <Frame>
        <ConnectionsSection active />
      </Frame>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const ready = useChunkerStub(emptySeed);
    if (!ready) return <span />;
    return (
      <Frame>
        <ConnectionsSection active />
      </Frame>
    );
  },
};

export const TestFails: Story = {
  render: () => {
    const ready = useChunkerStub(filledSeed, "fail");
    if (!ready) return <span />;
    return (
      <Frame>
        <ConnectionsSection active />
      </Frame>
    );
  },
};
