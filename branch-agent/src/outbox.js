import fs from "fs";
import path from "path";
import { dataDir } from "./paths.js";
import { logger } from "./logger.js";

const queuePath = () => path.join(dataDir(), "queue.jsonl");
const statePath = () => path.join(dataDir(), "state.json");
const lockPath = () => path.join(dataDir(), "outbox.lock");

export const makePunchKey = (devicePin, punchedAt, serialNo = "") =>
  `${String(devicePin)}|${String(punchedAt)}|${String(serialNo ?? "")}`;

const sleepSync = (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin — keep outbox mutations sync */
  }
};

/** Best-effort cross-process lock so tray + CLI don't rewrite queue together. */
const withFileLock = (fn) => {
  const file = lockPath();
  const start = Date.now();
  let fd = null;
  while (Date.now() - start < 5000) {
    try {
      fd = fs.openSync(file, "wx");
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        const age = Date.now() - fs.statSync(file).mtimeMs;
        if (age > 30000) fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
      sleepSync(25);
    }
  }
  if (fd === null) {
    throw new Error("Outbox lock timeout");
  }
  try {
    return fn();
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
};

const atomicWriteText = (filePath, body) => {
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, filePath);
};

const atomicWriteJson = (filePath, obj) => {
  atomicWriteText(filePath, JSON.stringify(obj, null, 2));
};

const defaultState = () => ({
  initialized: false,
  initializedAt: null,
  lastQueuedSerial: null,
  lastQueuedTime: null,
  lastSuccessfulSync: null,
  lastQueuedAt: null,
  stats: { queued: 0, sent: 0, failed: 0, reconnects: 0 },
});

export const loadState = () => {
  const file = statePath();
  if (!fs.existsSync(file)) return defaultState();

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...defaultState(),
      ...data,
      stats: { ...defaultState().stats, ...(data.stats || {}) },
    };
  } catch (err) {
    logger.error("Failed to read state.json, starting fresh", err.message);
    return defaultState();
  }
};

export const saveState = (state) => {
  atomicWriteJson(statePath(), state);
  return state;
};

export const loadQueue = () => {
  const file = queuePath();
  if (!fs.existsSync(file)) return [];

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const records = [];
  let dirty = false;

  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      dirty = true;
      logger.warn("Skipping corrupt queue line");
    }
  }

  if (dirty) rewriteQueue(records);
  return records;
};

const rewriteQueue = (records) => {
  const body = records.map((r) => JSON.stringify(r)).join("\n");
  atomicWriteText(queuePath(), body ? `${body}\n` : "");
};

const countPending = (records) =>
  records.filter((r) => r.status === "pending").length;

/**
 * Enqueue new punches after checkpoint filter.
 * Advances lastQueuedSerial / lastQueuedTime.
 */
export const enqueuePunches = (punches = [], state = null) =>
  withFileLock(() => {
    let st = state || loadState();
    if (!punches.length) {
      return { added: 0, pending: getPendingCountUnlocked(), state: st };
    }

    const records = loadQueue();
    const known = new Set(
      records.map(
        (r) => r.key || makePunchKey(r.devicePin, r.punchedAt, r.serialNo)
      )
    );
    let added = 0;
    const now = new Date().toISOString();
    let lastSerial = st.lastQueuedSerial;
    let lastTime = st.lastQueuedTime;

    for (const punch of punches) {
      const devicePin = String(
        punch.devicePin || punch.employeeId || punch.deviceUserId || ""
      ).trim();
      const punchedAt = punch.punchedAt
        ? new Date(punch.punchedAt).toISOString()
        : "";
      if (!devicePin || !punchedAt || Number.isNaN(Date.parse(punchedAt))) continue;

      const serialNo =
        punch.serialNo === null || punch.serialNo === undefined
          ? ""
          : Number(punch.serialNo);

      const key = makePunchKey(devicePin, punchedAt, serialNo);
      if (known.has(key)) continue;

      records.push({
        id: `${Date.now()}-${added}-${key}`,
        key,
        devicePin,
        punchedAt,
        serialNo: serialNo === "" || Number.isNaN(serialNo) ? null : serialNo,
        date: punch.date || punchedAt.slice(0, 10),
        deviceSerial: punch.deviceSerial || "",
        status: "pending",
        attempts: 0,
        lastError: null,
        createdAt: now,
        sentAt: null,
      });
      known.add(key);
      added += 1;

      if (serialNo !== "" && !Number.isNaN(serialNo)) lastSerial = serialNo;
      lastTime = punchedAt;
    }

    if (added > 0) {
      rewriteQueue(records);
      st.lastQueuedSerial = lastSerial;
      st.lastQueuedTime = lastTime;
      st.lastQueuedAt = now;
      st.stats.queued += added;
      saveState(st);
      logger.info(`Queued ${added} new punch(es)`, {
        pending: countPending(records),
      });
    }

    return { added, pending: countPending(records), state: st };
  });

const getPendingCountUnlocked = () =>
  loadQueue().filter((r) => r.status === "pending").length;

export const getPendingRecords = () =>
  loadQueue().filter((r) => r.status === "pending");

export const getPendingCount = () => getPendingCountUnlocked();

export const getOutboxStats = () => {
  const records = loadQueue();
  const st = loadState();
  return {
    pending: countPending(records),
    total: records.length,
    sent: records.filter((r) => r.status === "sent").length,
    failed: records.filter((r) => r.status === "failed").length,
    initialized: st.initialized,
    lastQueuedSerial: st.lastQueuedSerial,
    lastQueuedTime: st.lastQueuedTime,
    lastSuccessfulSync: st.lastSuccessfulSync,
    lastQueuedAt: st.lastQueuedAt,
    stats: st.stats,
  };
};

export const updateRecords = (updates = []) =>
  withFileLock(() => {
    if (!updates.length) return { sentCount: 0, failedCount: 0 };

    const byId = new Map(updates.map((u) => [u.id, u]));
    const records = loadQueue();
    let sentCount = 0;
    let failedCount = 0;
    const now = new Date().toISOString();

    for (const row of records) {
      const u = byId.get(row.id);
      if (!u) continue;

      row.attempts = (row.attempts || 0) + 1;
      if (u.lastError !== undefined) row.lastError = u.lastError;

      if (u.status === "sent") {
        row.status = "sent";
        row.sentAt = now;
        row.lastError = null;
        sentCount += 1;
      } else if (u.status === "failed") {
        row.status = "failed";
        failedCount += 1;
      } else if (u.status === "pending") {
        row.status = "pending";
      }
    }

    rewriteQueue(records);
    pruneSent(records);

    const st = loadState();
    if (sentCount) st.stats.sent += sentCount;
    if (failedCount) st.stats.failed += failedCount;
    if (sentCount) st.lastSuccessfulSync = now;
    saveState(st);

    return { sentCount, failedCount };
  });

const pruneSent = (records, keepSent = 500) => {
  const sent = records.filter((r) => r.status === "sent");
  const active = records.filter((r) => r.status !== "sent");
  if (sent.length <= keepSent) return;
  sent.sort((a, b) => String(a.sentAt || "").localeCompare(String(b.sentAt || "")));
  rewriteQueue([...active, ...sent.slice(-keepSent)]);
};

export const markInitialized = (state, lastSerial, lastTime) =>
  withFileLock(() => {
    state.initialized = true;
    state.lastQueuedSerial =
      lastSerial === null || lastSerial === undefined ? null : Number(lastSerial);
    state.lastQueuedTime = lastTime || null;
    state.initializedAt = new Date().toISOString();
    saveState(state);
    logger.info("Initialized — old device logs skipped (first install only)");
    return state;
  });

export const bumpReconnect = () =>
  withFileLock(() => {
    const st = loadState();
    st.stats.reconnects += 1;
    saveState(st);
  });

export const markSuccessfulSync = () =>
  withFileLock(() => {
    const st = loadState();
    st.lastSuccessfulSync = new Date().toISOString();
    saveState(st);
  });

export const getQueuePath = () => queuePath();
export const getDataDir = () => dataDir();
