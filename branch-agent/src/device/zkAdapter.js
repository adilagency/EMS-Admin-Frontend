/**
 * ZKTeco LAN pull adapter (TCP 4370 via node-zklib).
 * Reliability patterns from Gymfinity ZKTeco Agent 1.0.9:
 * timeouts, hard socket destroy, force reconnect on hang/stale.
 * Never clears device attendance logs by default.
 */
import { logger } from "../logger.js";
import {
  mapRawLog,
  sortLogs,
  toIsoTime,
} from "./punchHelpers.js";

const DEFAULT_FETCH_TIMEOUT_MS = 25000;
const DEFAULT_CONNECT_TIMEOUT_MS = 12000;

async function loadZkLib() {
  try {
    const mod = await import("node-zklib");
    return mod.default || mod.ZKLib || mod;
  } catch {
    /* try legacy package name */
  }
  try {
    const mod = await import("zklib");
    return mod.default || mod.ZKLib || mod;
  } catch {
    throw new Error(
      "Install a ZK client: npm install node-zklib (preferred) or zklib. Or set deviceMode=mock."
    );
  }
}

function withTimeout(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Persistent ZK session with hard reset — same shape as Gymfinity createDevice().
 */
export function createDevice({
  deviceIp,
  devicePort = 4370,
  fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
} = {}) {
  let ZKLibCtor = null;
  let zk = null;
  let isConnected = false;
  const port = Number(devicePort) || 4370;
  const timeoutMs =
    Number(fetchTimeoutMs) > 0 ? Number(fetchTimeoutMs) : DEFAULT_FETCH_TIMEOUT_MS;

  async function ensureLib() {
    if (!ZKLibCtor) ZKLibCtor = await loadZkLib();
    return ZKLibCtor;
  }

  function newClient() {
    return new ZKLibCtor(deviceIp, port, 10000, 4000);
  }

  function destroySocketHard() {
    try {
      const sock = zk?.zklibTcp?.socket || zk?.zklibUdp?.socket || null;
      if (sock && typeof sock.destroy === "function") {
        sock.destroy();
      }
    } catch {
      /* ignore */
    }
    try {
      if (zk && typeof zk.disconnect === "function") {
        Promise.resolve(zk.disconnect()).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    isConnected = false;
    try {
      if (ZKLibCtor) zk = newClient();
    } catch {
      zk = null;
    }
  }

  async function disconnectQuiet() {
    try {
      if (zk && typeof zk.disconnect === "function") {
        await withTimeout(zk.disconnect(), 5000, "disconnect");
      }
    } catch {
      destroySocketHard();
    }
    isConnected = false;
  }

  async function connect() {
    await ensureLib();
    await disconnectQuiet();
    zk = newClient();
    try {
      await withTimeout(zk.createSocket(), DEFAULT_CONNECT_TIMEOUT_MS, "createSocket");
      isConnected = true;
      logger.info("Connected to device", { ip: deviceIp, port });
      return true;
    } catch (err) {
      isConnected = false;
      destroySocketHard();
      logger.warn("Device connection failed", err.message || String(err));
      return false;
    }
  }

  /** Drop any half-open ZK TCP session and build a fresh client. */
  async function forceReset() {
    await ensureLib();
    destroySocketHard();
    return connect();
  }

  /**
   * Fresh connect each pull — ZK TCP can keep a stale attendance snapshot
   * on a long-lived socket (Gymfinity 1.0.9 pattern).
   */
  async function fetchAttendances() {
    if (!deviceIp) {
      return { ok: false, logs: [], error: "Device IP is not configured" };
    }

    const connected = await connect();
    if (!connected) {
      return { ok: false, logs: [], error: "not_connected" };
    }

    try {
      const result = await withTimeout(
        zk.getAttendances(),
        timeoutMs,
        "getAttendances"
      );
      if (result?.err) {
        logger.warn("Device returned partial attendance error", String(result.err));
      }
      const raw = result?.data || result || [];
      const logs = sortLogs(Array.isArray(raw) ? raw : []);
      return { ok: true, logs, error: null };
    } catch (err) {
      isConnected = false;
      logger.warn("Device error → will reconnect", err.message || String(err));
      destroySocketHard();
      return { ok: false, logs: [], error: err.message || String(err) };
    }
  }

  async function clearAttendanceLog() {
    if (!isConnected) {
      const ok = await connect();
      if (!ok) return false;
    }
    try {
      await withTimeout(zk.clearAttendanceLog(), 15000, "clearAttendanceLog");
      logger.info("Cleared device attendance log");
      return true;
    } catch (err) {
      logger.warn("Failed to clear device log", err.message || String(err));
      return false;
    }
  }

  return {
    connect,
    forceReset,
    fetchAttendances,
    clearAttendanceLog,
    getConnected: () => isConnected,
    disconnectQuiet,
  };
}

/** One-shot fetch (CLI / tests) — creates a temporary device session. */
export async function fetchAttendances({
  deviceIp,
  devicePort = 4370,
  fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
} = {}) {
  const device = createDevice({ deviceIp, devicePort, fetchTimeoutMs });
  try {
    return await device.fetchAttendances();
  } finally {
    try {
      await device.disconnectQuiet();
    } catch {
      /* ignore */
    }
  }
}

/** Map device rows → EMS punch objects */
export function mapDeviceLogs(rawLogs) {
  return (rawLogs || []).map(mapRawLog).filter(Boolean);
}

export async function fetchPunches(opts) {
  const { ok, logs, error } = await fetchAttendances(opts);
  if (!ok) {
    throw new Error(error || "Cannot connect to ZK device");
  }
  return mapDeviceLogs(logs);
}

export async function fetchPunchesForToday(opts) {
  const punches = await fetchPunches(opts);
  const today = toIsoTime(new Date())?.slice(0, 10);
  return punches.filter((p) => p.date === today);
}

export async function clearAttendanceLog({
  deviceIp,
  devicePort = 4370,
  fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
} = {}) {
  const device = createDevice({ deviceIp, devicePort, fetchTimeoutMs });
  try {
    return await device.clearAttendanceLog();
  } finally {
    try {
      await device.disconnectQuiet();
    } catch {
      /* ignore */
    }
  }
}
