import { app, BrowserWindow, nativeImage, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registerAllHandlers } from "./ipc/registerHandlers";

/**
 * Resolve the runtime logo PNG.
 *
 * - **Dev**: the main bundle runs from `out/main/`, so the project's
 *   `resources/` folder is two levels up.
 * - **Packaged**: electron-builder's `extraResources` block copies the
 *   logos into the app's Resources directory, accessed via
 *   `process.resourcesPath`.
 *
 * macOS ignores `BrowserWindow.icon` entirely — the Dock + Cmd-Tab
 * always read from the app bundle's `.icns` in packaged builds, and
 * from Electron's default in dev. We work around that below by calling
 * `app.dock.setIcon` once `app.whenReady()` resolves, which overrides
 * the dev-time default with our PNG.
 */
const ICON_PATH = is.dev
  ? join(__dirname, "../../resources/logo.png")
  : join(process.resourcesPath, "logo.png");

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    // Below this the sidebar slider headers + toggle rows start
    // overlapping (especially with Spanish labels). Pick a floor that
    // keeps the two-pane workspace + sidebar comfortably readable
    // without forcing a tablet-class minimum.
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#0b0c10",
    icon: ICON_PATH,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      // Defence-in-depth: even with contextIsolation, a sandboxed
      // renderer can't directly call Node APIs if context isolation
      // were ever bypassed. The preload uses contextBridge only, so
      // it's already sandbox-compatible.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

/**
 * Force-set the Dock icon on macOS so dev mode doesn't fall back to
 * Electron's default. In packaged builds the bundle's .icns wins, but
 * setting it again here is a harmless no-op.
 */
function setMacDockIcon(): void {
  if (process.platform !== "darwin" || !app.dock) return;
  if (!existsSync(ICON_PATH)) {
    console.warn("[icon] PNG not found at", ICON_PATH);
    return;
  }
  const image = nativeImage.createFromPath(ICON_PATH);
  if (image.isEmpty()) {
    console.warn("[icon] failed to load PNG at", ICON_PATH);
    return;
  }
  app.dock.setIcon(image);
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.solintsoft.chunkerstudio");
  setMacDockIcon();

  app.on("browser-window-created", (_, win) => {
    optimizer.watchWindowShortcuts(win);
  });

  registerAllHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
