/**
 * SMDS Integration API client (Adil Agencies field orders).
 * Docs: docs/SMDS-Integration-API.md
 */

const DEFAULT_BASE = "https://sds.adilagencies.net/api/integration/v1";

let cached = {
  accessToken: null,
  refreshToken: null,
  accessExpiresAt: 0,
};

const baseUrl = () =>
  String(process.env.SMDS_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { status: "error", message: text || res.statusText };
  }
};

const request = async (path, { method = "GET", body, token, retry = true } = {}) => {
  const headers = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJson(res);

  if (res.status === 429 && retry) {
    const wait = Number(res.headers.get("Retry-After") || 5) * 1000;
    await sleep(Math.min(Math.max(wait, 2000), 30000));
    return request(path, { method, body, token, retry: false });
  }

  if (!res.ok) {
    const err = new Error(data.message || `SMDS HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }

  return data;
};

export const smdsConfigured = () =>
  Boolean(process.env.SMDS_LOGIN_ID && process.env.SMDS_SECRET);

export const smdsLogin = async () => {
  if (!smdsConfigured()) {
    throw new Error("SMDS credentials missing (SMDS_LOGIN_ID / SMDS_SECRET)");
  }

  const data = await request("/auth/token", {
    method: "POST",
    body: {
      loginId: process.env.SMDS_LOGIN_ID,
      secret: process.env.SMDS_SECRET,
    },
  });

  const d = data.data || {};
  cached = {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    accessExpiresAt: Date.now() + (Number(d.expiresIn) || 900) * 1000 - 60_000,
  };
  return cached;
};

const smdsRefresh = async () => {
  if (!cached.refreshToken) return smdsLogin();
  try {
    const data = await request("/auth/refresh", {
      method: "POST",
      body: { refreshToken: cached.refreshToken },
    });
    const d = data.data || {};
    cached = {
      accessToken: d.accessToken,
      refreshToken: d.refreshToken,
      accessExpiresAt: Date.now() + (Number(d.expiresIn) || 900) * 1000 - 60_000,
    };
    return cached;
  } catch {
    return smdsLogin();
  }
};

export const getAccessToken = async () => {
  if (cached.accessToken && Date.now() < cached.accessExpiresAt) {
    return cached.accessToken;
  }
  if (cached.refreshToken) {
    await smdsRefresh();
  } else {
    await smdsLogin();
  }
  return cached.accessToken;
};

const authedGet = async (path) => {
  let token = await getAccessToken();
  try {
    return await request(path, { token });
  } catch (err) {
    if (err.status === 401) {
      await smdsLogin();
      token = await getAccessToken();
      return request(path, { token });
    }
    throw err;
  }
};

export const smdsGetBu = () => authedGet("/bu");

export const smdsGetParty = (buGuid, partyType) => {
  const q = new URLSearchParams({ buGuid });
  if (partyType) q.set("partyType", partyType);
  return authedGet(`/party?${q}`);
};

export const smdsGetBookingOrder = (buGuid, salesmanId, date) => {
  const q = new URLSearchParams({ buGuid, salesmanId, date });
  return authedGet(`/booking-order?${q}`);
};

export const smdsGetBookingRoute = (buGuid, salesmanId, date) => {
  const q = new URLSearchParams({ buGuid, salesmanId, date });
  return authedGet(`/booking-route?${q}`);
};
