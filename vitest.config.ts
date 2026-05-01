import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Vitest config — runs in plain Node, so anything that imports Electron
 * directly (`import ... from "electron"`) needs to live behind a
 * separate test path or be mocked. The pure utilities under
 * `src/renderer/src/lib/`, `src/main/ipc/pathGuard.ts`, and the chunking
 * pipeline all run cleanly here.
 *
 * Path aliases mirror `tsconfig.web.json` and `tsconfig.node.json` so
 * imports like `@/lib/foo` and `@shared/types` resolve in tests.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/main/core/**/*.ts",
        "src/main/ipc/pathGuard.ts",
        "src/main/ipc/wrap.ts",
        "src/renderer/src/lib/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.stories.tsx",
        "**/*.test.ts",
        "**/index.ts",
        // Renderer-only constants / locator symbols — no logic to cover.
        "src/main/core/**/Locator.ts",
        "src/renderer/src/lib/i18n/*.ts",
        "src/renderer/src/lib/mock.ts",
        // Pure-delegator use cases (one line: `return this.dep.method(args)`).
        // Their behavior is the type system; tests would just re-state the
        // implementation. The non-trivial use cases (Parse, TestConnection,
        // Ingest) live elsewhere and *are* covered.
        "src/main/core/chunking/application/*.ts",
        "src/main/core/config/application/*.ts",
        "src/main/core/filesystem/application/*.ts",
      ],
      // 70% gate. Reflects the "test the things that ship" bar — not
      // the kitchen sink. CI runs `npm run test:coverage` and fails the
      // PR if any of these dimensions drops below the threshold.
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
