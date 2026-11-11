import fs from "fs";
import path from "path";
import { homeConfigDir } from "./paths.js";

const defaults = {
  apiUrl: "https://ems-admin-r5m4.onrender.com/api",
  deviceSecret: "",
  deviceIp: "192.168.1.201",
  devicePort: 4370,
  pollIntervalSeconds: 5,
  syncIntervalSeconds: 3,
  lookbackDays: 7,
  uploadBatchSize: 50,
  deviceMode: "zk",
  openAtLogin: true,
  clearDeviceAfterQueue: false,
  /** Kill hung getAttendances / connect after this many ms */
  fetchTimeoutMs: 25000,
  /** Watchdog tick interval */
  watchdogIntervalMs: 15000,
  /** Auto-recover if last successful pull older than this */
  watchdogStaleMs: 45000,
  /** Auto-recover if a single poll stays busy longer than this */
  pollHangMs: 35000,
  /** Minimum gap between auto-recovers */
  recoverCooldownMs: 20000,
};

export const getConfigDir = () => homeConfigDir();
export const getConfigPath = () => path.join(getConfigDir(), "config.json");

export const loadConfig = () => {
  try {
    const file = getConfigPath();
    if (!fs.existsSync(file)) return { ...defaults };
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const merged = { ...defaults, ...raw };
    return {
      ...merged,
      devicePort: Number(merged.devicePort) || 4370,
      pollIntervalSeconds: Number(merged.pollIntervalSeconds) || 5,
      syncIntervalSeconds: Number(merged.syncIntervalSeconds) || 3,
      uploadBatchSize: Number(merged.uploadBatchSize) || 50,
      fetchTimeoutMs: Number(merged.fetchTimeoutMs) || defaults.fetchTimeoutMs,
      watchdogIntervalMs:
        Number(merged.watchdogIntervalMs) || defaults.watchdogIntervalMs,
      watchdogStaleMs:
        Number(merged.watchdogStaleMs) || defaults.watchdogStaleMs,
      pollHangMs: Number(merged.pollHangMs) || defaults.pollHangMs,
      recoverCooldownMs:
        Number(merged.recoverCooldownMs) || defaults.recoverCooldownMs,
      openAtLogin: merged.openAtLogin !== false,
      clearDeviceAfterQueue: Boolean(merged.clearDeviceAfterQueue),
    };
  } catch {
    return { ...defaults };
  }
};

export const saveConfig = (next) => {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = loadConfig();
  const merged = {
    ...defaults,
    ...current,
    ...next,
    devicePort: Number(next?.devicePort ?? current.devicePort) || 4370,
    pollIntervalSeconds:
      Number(next?.pollIntervalSeconds ?? current.pollIntervalSeconds) || 5,
    syncIntervalSeconds:
      Number(next?.syncIntervalSeconds ?? current.syncIntervalSeconds) || 3,
    uploadBatchSize:
      Number(next?.uploadBatchSize ?? current.uploadBatchSize) || 50,
    fetchTimeoutMs:
      Number(next?.fetchTimeoutMs ?? current.fetchTimeoutMs) ||
      defaults.fetchTimeoutMs,
    watchdogIntervalMs:
      Number(next?.watchdogIntervalMs ?? current.watchdogIntervalMs) ||
      defaults.watchdogIntervalMs,
    watchdogStaleMs:
      Number(next?.watchdogStaleMs ?? current.watchdogStaleMs) ||
      defaults.watchdogStaleMs,
    pollHangMs:
      Number(next?.pollHangMs ?? current.pollHangMs) || defaults.pollHangMs,
    recoverCooldownMs:
      Number(next?.recoverCooldownMs ?? current.recoverCooldownMs) ||
      defaults.recoverCooldownMs,
    openAtLogin:
      next?.openAtLogin !== undefined
        ? Boolean(next.openAtLogin)
        : current.openAtLogin !== false,
    clearDeviceAfterQueue: Boolean(
      next?.clearDeviceAfterQueue ?? current.clearDeviceAfterQueue
    ),
  };
  fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
};

export { defaults };
