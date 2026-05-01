import { app, BrowserWindow, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { join } from "path";
import { registerAllHandlers } from "./ipc/registerHandlers";

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.solintsoft.chunkerstudio");

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
