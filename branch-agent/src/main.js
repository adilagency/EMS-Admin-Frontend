// Silence broken stdout/stderr FIRST — silent / no-console launches
// otherwise console.log from logger or node-zklib throws EPIPE and kills Electron.
(function installPipeGuards() {
  for (const stream of [process.stdout, process.stderr]) {
    if (stream && typeof stream.on === "function") {
      stream.on("error", () => {});
    }
  }
  const wrap =
    (fn) =>
    (...args) => {
      try {
        return fn(...args);
      } catch {
        /* EPIPE etc. */
      }
    };
  console.log = wrap(console.log.bind(console));
  console.info = wrap(console.info.bind(console));
  console.warn = wrap(console.warn.bind(console));
  console.error = wrap(console.error.bind(console));
})();

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  powerMonitor,
} from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { loadConfig, saveConfig, getConfigPath } from "./config.js";
import {
  startAgentLoop,
  stopAgentLoop,
  getAgentState,
  runSyncCycle,
  recoverFromSleep,
  reloadRuntimeConfig,
} from "./sync.js";
import { logger } from "./logger.js";
import { logsDir } from "./paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEADLESS =
  process.argv.includes("--headless") ||
  process.argv.includes("--service") ||
  process.env.EMS_AGENT_HEADLESS === "1";

let tray = null;
let settingsWin = null;

process.on("uncaughtException", (err) => {
  if (err && (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED")) {
    return;
  }
  try {
    const line = `[${new Date().toISOString()}] ${err?.stack || err}\n`;
    fs.mkdirSync(logsDir(), { recursive: true });
    fs.appendFileSync(path.join(logsDir(), "crash.log"), line);
  } catch {
    /* ignore */
  }
  logger.error("uncaughtException", err?.message || String(err));
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

const applyLoginItem = (enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: true,
      path: process.execPath,
      args: HEADLESS ? ["--headless"] : [],
    });
  } catch (err) {
    logger.warn("setLoginItemSettings failed", err.message);
  }
};

const createSettingsWindow = () => {
  if (HEADLESS) return;
  if (settingsWin) {
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 720,
    height: 820,
    minWidth: 640,
    minHeight: 640,
    resizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWin.loadFile(path.join(__dirname, "../renderer/index.html"));
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
};

const updateTrayMenu = () => {
  if (HEADLESS || !tray) return;

  const state = getAgentState();
  const config = loadConfig();
  const label = state.branchName
    ? `Branch: ${state.branchName}`
    : "Branch agent";

  const menu = Menu.buildFromTemplate([
    { label, enabled: false },
    {
      label: state.deviceConnected ? "K50: Connected" : "K50: Disconnected",
      enabled: false,
    },
    {
      label: state.online ? "EMS Server: Online" : "EMS Server: Offline",
      enabled: false,
    },
    {
      label: `Pending upload: ${state.pendingCount ?? 0}`,
      enabled: false,
    },
    {
      label: state.lastSyncAt
        ? `Last upload: ${new Date(state.lastSyncAt).toLocaleString()}`
        : "Not uploaded yet",
      enabled: false,
    },
    {
      label: state.lastPullAt
        ? `Last pull: ${new Date(state.lastPullAt).toLocaleString()}`
        : "No device pull yet",
      enabled: false,
    },
    {
      label: state.lastError
        ? `Error: ${String(state.lastError).slice(0, 40)}`
        : "Status: OK",
      enabled: false,
    },
    {
      label:
        state.recoverCount > 0
          ? `Auto-recover x${state.recoverCount}`
          : "Auto-recover: idle",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Sync now (pull + upload)",
      click: async () => {
        try {
          await runSyncCycle({ catchUp: true });
          updateTrayMenu();
        } catch (err) {
          console.error(err);
          updateTrayMenu();
        }
      },
    },
    {
      label: "Settings",
      click: () => createSettingsWindow(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        stopAgentLoop();
        app.quit();
      },
    },
  ]);

  tray.setToolTip(`ADIL AGENCIES Agent — ${config.deviceIp || "no device"}`);
  tray.setContextMenu(menu);
};

const createTrayIcon = () => {
  const candidates = [
    path.join(__dirname, "../renderer/assets/tray-icon.png"),
    path.join(__dirname, "../build/icon.png"),
    path.join(process.resourcesPath || "", "tray-icon.png"),
  ];

  for (const iconPath of candidates) {
    try {
      if (!iconPath) continue;
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
    } catch {
      // try next
    }
  }

  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALElEQVQ4T2NkYGD4z0ABYBzVMKoBBgYGRvL8/5+BkYGBgRGmAKceUjWAYgAAzFkCAf1cQJwAAAAASUVORK5CYII=";
  return nativeImage.createFromDataURL(`data:image/png;base64,${pngBase64}`);
};

app.on("second-instance", () => {
  if (!HEADLESS) createSettingsWindow();
});

app.whenReady().then(() => {
  const config = loadConfig();
  applyLoginItem(config.openAtLogin);

  if (!HEADLESS) {
    tray = new Tray(createTrayIcon());
    tray.setToolTip("EMS Branch Agent");
    tray.on("double-click", () => createSettingsWindow());
    tray.on("click", () => createSettingsWindow());
    updateTrayMenu();

    try {
      tray.displayBalloon({
        title: "EMS Branch Agent",
        content: "Running in the system tray. Auto-sync + auto-recover active.",
      });
    } catch {
      // balloon optional
    }
  }

  ipcMain.handle("get-config", () => loadConfig());
  ipcMain.handle("save-config", (_e, next) => {
    const saved = saveConfig(next);
    applyLoginItem(saved.openAtLogin);
    try {
      reloadRuntimeConfig();
    } catch {
      /* ignore */
    }
    updateTrayMenu();
    return saved;
  });
  ipcMain.handle("get-state", () => getAgentState());
  ipcMain.handle("get-config-path", () => getConfigPath());
  ipcMain.handle("sync-now", async () => runSyncCycle({ catchUp: true }));
  ipcMain.handle("get-app-info", () => ({
    packaged: app.isPackaged,
    version: app.getVersion(),
    execPath: process.execPath,
    headless: HEADLESS,
  }));

  if (!HEADLESS && !config.deviceSecret) {
    createSettingsWindow();
  }

  startAgentLoop(() => updateTrayMenu()).catch((err) => {
    logger.error("agent loop failed", err.message || String(err));
    updateTrayMenu();
  });

  // After sleep/hibernate / unlock, ZK TCP is usually dead even if the tray looks fine
  const onOsWake = (reason) => {
    logger.info(`powerMonitor ${reason} → recover device`);
    recoverFromSleep()
      .then(() => updateTrayMenu())
      .catch((err) => {
        logger.warn("recoverFromSleep failed", err.message || String(err));
      });
  };
  try {
    powerMonitor.on("resume", () => onOsWake("resume"));
    powerMonitor.on("unlock-screen", () => onOsWake("unlock-screen"));
  } catch (err) {
    logger.warn("powerMonitor not available", err.message || String(err));
  }

  if (HEADLESS) {
    logger.info("Running headless / service mode");
  }
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

process.on("SIGINT", () => {
  stopAgentLoop();
  app.quit();
});
process.on("SIGTERM", () => {
  stopAgentLoop();
  app.quit();
});
