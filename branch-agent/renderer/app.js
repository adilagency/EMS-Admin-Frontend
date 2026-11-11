function setIndicator(dotId, textId, cardId, ok, okText, badText, hintId, hintOk, hintBad) {
  const dot = document.getElementById(dotId);
  const text = document.getElementById(textId);
  const card = document.getElementById(cardId);
  const hint = hintId ? document.getElementById(hintId) : null;

  dot.classList.toggle("ok", ok);
  dot.classList.toggle("bad", !ok);
  card.classList.toggle("ok", ok);
  card.classList.toggle("bad", !ok);
  text.textContent = ok ? okText : badText;
  if (hint) hint.textContent = ok ? hintOk : hintBad;
}

function isEditingForm() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
}

async function fillForm() {
  const cfg = await window.emsAgent.getConfig();
  const path = await window.emsAgent.getConfigPath();

  document.getElementById("apiUrl").value = cfg.apiUrl || "";
  document.getElementById("deviceSecret").value = cfg.deviceSecret || "";
  document.getElementById("deviceIp").value = cfg.deviceIp || "";
  document.getElementById("devicePort").value = cfg.devicePort || 4370;
  document.getElementById("pollIntervalSeconds").value =
    cfg.pollIntervalSeconds || 5;
  document.getElementById("syncIntervalSeconds").value =
    cfg.syncIntervalSeconds || 3;
  document.getElementById("deviceMode").value = cfg.deviceMode || "mock";
  document.getElementById("openAtLogin").checked = Boolean(cfg.openAtLogin);
  document.getElementById("path").textContent = `Config file: ${path}`;

  try {
    const info = await window.emsAgent.getAppInfo?.();
    const el = document.getElementById("appInfo");
    if (el && info) {
      el.textContent = info.packaged
        ? `Installed app v${info.version}`
        : `Dev mode v${info.version}`;
    }
  } catch {
    // older preload
  }
}

async function fillStatus() {
  const cfg = await window.emsAgent.getConfig();
  const state = await window.emsAgent.getState();

  document.getElementById("pendingCount").textContent = String(
    state.pendingCount ?? state.outbox?.pending ?? 0
  );

  const recoverEl = document.getElementById("recoverCount");
  if (recoverEl) {
    const n = Number(state.recoverCount) || 0;
    recoverEl.textContent = n > 0 ? `×${n}` : "Idle";
  }

  const deviceOk = Boolean(state.deviceConnected);
  setIndicator(
    "deviceDot",
    "deviceStatus",
    "deviceCard",
    deviceOk,
    "Connected",
    "Disconnected",
    "deviceHint",
    cfg.deviceMode === "mock"
      ? "Mock mode — treated as connected"
      : `Reachable at ${cfg.deviceIp || "—"}:${cfg.devicePort || 4370}`,
    state.deviceLastError || "Cannot reach K50 on LAN"
  );

  const serverOk = Boolean(state.online);
  const apiHint = cfg.apiUrl || "Set Backend API URL below";
  setIndicator(
    "serverDot",
    "onlineStatus",
    "serverCard",
    serverOk,
    "Online",
    "Offline",
    "serverHint",
    `Uploading to ${apiHint}`,
    `Offline — punches stay in outbox (${apiHint})`
  );

  const status = document.getElementById("status");
  const parts = [];
  if (state.branchName) parts.push(`Bound to ${state.branchName}`);
  if (state.outbox?.initialized === false) {
    parts.push("first install — history skipped on next poll");
  }
  if (state.lastSyncAt) {
    parts.push(`last upload ${new Date(state.lastSyncAt).toLocaleString()}`);
  }
  if (state.lastPullAt) {
    parts.push(`last pull ${new Date(state.lastPullAt).toLocaleString()}`);
  }
  if (state.lastError) parts.push(state.lastError);
  // Don't wipe a "Saved..." message while idle
  if (parts.length) status.textContent = parts.join(" · ");
}

async function refresh() {
  await fillStatus();
  // Never clobber fields while the user is typing
  if (!isEditingForm()) {
    // Only re-load form from disk if not editing — still skip to avoid cursor jumps
    // Form is loaded on start + after Save only
  }
}

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const next = {
    apiUrl: document.getElementById("apiUrl").value.trim().replace(/\/$/, ""),
    deviceSecret: document.getElementById("deviceSecret").value.trim(),
    deviceIp: document.getElementById("deviceIp").value.trim(),
    devicePort: Number(document.getElementById("devicePort").value) || 4370,
    pollIntervalSeconds:
      Number(document.getElementById("pollIntervalSeconds").value) || 5,
    syncIntervalSeconds:
      Number(document.getElementById("syncIntervalSeconds").value) || 3,
    deviceMode: document.getElementById("deviceMode").value,
    openAtLogin: document.getElementById("openAtLogin").checked,
  };

  if (!next.apiUrl) {
    document.getElementById("status").textContent =
      "Backend API URL required (e.g. https://your-host/api)";
    return;
  }

  await window.emsAgent.saveConfig(next);
  document.getElementById("status").textContent =
    "Saved. Click Sync now — new backend URL applies immediately.";
  await fillStatus();
});

document.getElementById("toggleSecret").addEventListener("click", () => {
  const input = document.getElementById("deviceSecret");
  const btn = document.getElementById("toggleSecret");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
  btn.setAttribute("aria-label", show ? "Hide device secret" : "Show device secret");
});

document.getElementById("syncBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "Syncing (pull → outbox → upload)…";
  try {
    await window.emsAgent.syncNow();
    await fillStatus();
  } catch (err) {
    status.textContent = err.message || "Sync failed";
    await fillStatus();
  }
});

fillForm().then(fillStatus);
setInterval(fillStatus, 3000);
