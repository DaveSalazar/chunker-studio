import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      // Multiple entries: the main entry plus a dedicated bundle per
      // worker_thread. Workers run on the Node side and need to be
      // resolved at runtime via `new Worker(join(__dirname, "..."))`,
      // so the output paths must stay stable.
      rollupOptions: {
        input: {
          index: resolve("src/main/index.ts"),
          "workers/chunker-worker": resolve("src/main/workers/chunker-worker.ts"),
          "workers/parser-worker": resolve("src/main/workers/parser-worker.ts"),
        },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
      },
    },
    plugins: [react()],
  },
});
