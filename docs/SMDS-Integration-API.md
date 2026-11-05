# SMDS Integration API — Notes (Adil Agencies / EMS)

Read-only API for field attendance + route/TA data.  
Source: `SMDS-Integration-API-v1.pdf` + live tests (Nov 2026).

---

## Base URL (live)

```text
https://sds.adilagencies.net/api/integration/v1
```

> PDF also mentions `https://sds.getsmartapps.com/api/integration/v1` — that host was **503 / unreliable**.  
> **Use `.net` (adilagencies)** until they say otherwise.

- All requests/responses: **JSON over HTTPS**
- Timestamps: **ISO-8601 UTC** (e.g. `2026-10-27T04:31:09.000Z`) → Pakistan = UTC+5
- Dates: **YYYY-MM-DD**

### Credentials (store in `.env` only — never commit)

| Item | Example / notes |
|------|------------------|
| `loginId` | `adil.payroll` |
| `secret` | `isk__...` (can be reset from their webapp — ask if it stops working) |
| `buGuid` | From `GET /bu` (one per branch/BU) |
| Webhook secret | `whsec_...` only if webhook enabled (optional; we use pull for now) |

---

## Auth flow

1. `POST /auth/token` with `loginId` + `secret` → get `accessToken` + `refreshToken`
2. Every data call: header `Authorization: Bearer <accessToken>`
3. Access token ~**15 min** (`expiresIn: 900`)
4. Refresh token ~**90 days**, **one-time use** — always save the new refresh token
5. Re-using an old refresh token → session revoked → login again

---

## 1. Login — `POST /auth/token`

**Auth type (Postman):** No Auth

### Headers

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` (optional) |

### Body

```json
{
  "loginId": "adil.payroll",
  "secret": "isk__YOUR_SECRET_HERE"
}
```

### Expected response — 200

```json
{
  "status": "ok",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "refreshToken": "irt_xxxxxxxx",
    "refreshExpiresIn": 7776000
  }
}
```

### Errors

| HTTP | Code | Meaning |
|------|------|---------|
| 401 | `INVALID_CREDENTIALS` | Wrong loginId/secret |
| 423 | `ACCOUNT_LOCKED` | 5 wrong secrets; wait ~15 min |
| 503 | — | Integration service down |

**Live status:** Working on `sds.adilagencies.net` (tested OK).

---

## 2. Refresh — `POST /auth/refresh`

### Headers

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |

### Body

```json
{
  "refreshToken": "irt_xxxxxxxx"
}
```

### Expected response — 200

Same shape as `/auth/token` (new `accessToken` **and** new `refreshToken`).

### Errors

| HTTP | Code |
|------|------|
| 401 | `INVALID_REFRESH_TOKEN` / `REFRESH_TOKEN_REUSED` → login again |

---

## 3. Revoke — `POST /auth/revoke`

### Body

```json
{
  "refreshToken": "irt_xxxxxxxx"
}
```

### Expected response — 200

```json
{
  "status": "ok",
  "data": { "revoked": true }
}
```

Always succeeds even if token already gone.

---

## 4. Business units — `GET /bu`

**Auth:** Bearer token required.

### Headers

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <accessToken>` |
| `Accept` | `application/json` |

### Query params

| Param | Required | Notes |
|-------|----------|--------|
| `buGuid` | no | Omit = all BUs you can read; with value = that BU only |

### Expected response — 200 (live sample)

```json
{
  "status": "ok",
  "data": [
    {
      "buGuid": "2fa5c6c5-c7b0-4236-9ecb-8c9adeca6cb7",
      "name": "Adil Agencies Pvt Limited",
      "initial": "MPK",
      "address": "Plot No.C/S 442, A3, Umerkot Road, Mirpurkhas"
    },
    {
      "buGuid": "5ae92023-aad3-4932-accc-77dc89680648",
      "name": "Adil Agencies Pvt Limited",
      "initial": "THT",
      "address": "B-11 Unit #1 Hashimabad Housing Society Makli, Thatta"
    },
    {
      "buGuid": "4fd20560-feb5-4d4d-a762-0dd2591fdc14",
      "name": "Adil Agencies Pvt Ltd - SHD",
      "initial": "SHD",
      "address": "Tando Adam Road, Shahdadpur"
    }
  ]
}
```

**EMS mapping:** `buGuid` / `initial` (MPK, THT, SHD) → your Branch.

Every data call below needs `buGuid` (query or `X-BU-Guid` header).

---

## 5. Parties (salesman / deliveryman) — `GET /party`

### Headers

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <accessToken>` |

### Query params

| Param | Required | Notes |
|-------|----------|--------|
| `buGuid` | **yes** | From `/bu` |
| `partyType` | no | `salesman` \| `deliveryman`. Omit = all allowed types |

### Example

```http
GET /party?buGuid=5ae92023-aad3-4932-accc-77dc89680648&partyType=salesman
Authorization: Bearer <accessToken>
```

### Expected response — 200

```json
{
  "status": "ok",
  "data": [
    {
      "partyType": "salesman",
      "partyCode": "S-0012",
      "partyName": "Ali Raza"
    },
    {
      "partyType": "salesman",
      "partyCode": "S-0015",
      "partyName": "Bilal Ahmed"
    }
  ]
}
```

**EMS mapping:** `partyCode` → Employee field e.g. `smdsPartyCode` (maps to EMS `THT-1`).  
Use `partyCode` as `salesmanId` in booking endpoints. Only **active** parties returned.

---

## 6. Booking order (attendance) — `GET /booking-order`

**Use for:** first order of the day → mark **Present**.

### Headers

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <accessToken>` |

### Query params

| Param | Required | Notes |
|-------|----------|--------|
| `buGuid` | **yes** | |
| `salesmanId` | **yes** | = `partyCode` from `/party` |
| `date` | **yes** | `YYYY-MM-DD` |

### Example

```http
GET /booking-order?buGuid=...&salesmanId=S-0012&date=2026-11-03
Authorization: Bearer <accessToken>
```

### Expected response — booked (Present)

```json
{
  "status": "ok",
  "data": {
    "salesmanId": "S-0012",
    "date": "2026-10-27",
    "orderStatus": "booked",
    "firstOrderAt": "2026-10-27T04:31:09.000Z",
    "orders": [
      {
        "orderNo": "SO-000123",
        "orderDateTime": "2026-10-27T04:31:09.000Z",
        "customerName": "Al-Madina General Store",
        "area": "Gulberg",
        "areaCode": "A-014",
        "gps": { "lat": 31.5204, "lng": 74.3587 }
      }
    ]
  }
}
```

### Expected response — no order (Absent / no attendance)

```json
{
  "status": "ok",
  "data": {
    "salesmanId": "S-0012",
    "date": "2026-10-27",
    "orderStatus": "no order",
    "firstOrderAt": null,
    "orders": []
  }
}
```

### EMS attendance rule (our side)

| `orderStatus` | Action |
|---------------|--------|
| `"booked"` | Mark **Present** (`method: Vendor` / SMDS), use `firstOrderAt` (convert UTC→PK) |
| `"no order"` | Do **not** mark Present from SMDS |

Notes from docs:
- Visits with no order are not included as booked
- `area` / `areaCode` / `gps` on an order may be null
- Orders sorted oldest first

---

## 7. Booking route (TA areas) — `GET /booking-route`

**Use for:** route/area list → look up TA Rs from our master → create TaTrip(s).

### Headers

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <accessToken>` |

### Query params

| Param | Required | Notes |
|-------|----------|--------|
| `buGuid` | **yes** | |
| `salesmanId` | **yes** | = `partyCode` |
| `date` | **yes** | `YYYY-MM-DD` |

### Example

```http
GET /booking-route?buGuid=...&salesmanId=S-0012&date=2026-11-03
Authorization: Bearer <accessToken>
```

### Expected response — 200

```json
{
  "status": "ok",
  "data": {
    "salesmanId": "S-0012",
    "date": "2026-10-27",
    "routeName": "Monday Route 1",
    "areas": [
      { "areaCode": "A-014", "areaName": "Gulberg" },
      { "areaCode": "A-021", "areaName": "Model Town" }
    ]
  }
}
```

If no route planned: `routeName` is `null`, `areas` is `[]`.  
Multiple routes: names joined with `/`.

### EMS TA rule (owner clarified — Nov 2025/2026)

**Primary TA flow = manual entry by payroll operators (not auto from SMDS areas).**

Example (Thatta):
1. Field employee normally books orders on their routes (SMDS).
2. One day they travel (e.g. bus) and claim expense — *“ticket 600 Rs.”*
3. Payroll software operators enter a **TA claim** for that employee on that **date** (and time if needed) with amount **600**.
4. That amount is **added to salary** in the payroll run.

Implications for EMS build:
- Need a **TA entry screen** (employee + date + amount + optional note/route) — CRUD for HR/payroll users.
- SMDS `/booking-route` / `areas[]` is **supporting context** (what route they were on that day), not the automatic money calculator — unless owner later asks for fixed area rates again.
- Earlier idea (Badin=1000 auto) is **on hold** unless they still want a rate master as optional helper.

Attendance stays automatic: **first order = Present** via `/booking-order`.

---

## 8. Webhook (optional — not required for v1)

If enabled: they POST to **your** public HTTPS URL on first order of the day.

- Event: `first_order`
- Headers: `X-Event-Id`, `X-Signature`, `X-Timestamp`, …
- Verify: HMAC-SHA256 with `whsec_...`
- We can skip this and **pull daily** via GET endpoints

---

## Common errors

```json
{ "status": "error", "code": "RATE_LIMITED", "message": "Too many requests" }
```

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `BAD_REQUEST` | Bad body / date format |
| 400 | `BU_REQUIRED` | Missing `buGuid` |
| 400 | `SALESMAN_REQUIRED` | Missing `salesmanId` |
| 401 | `UNAUTHORIZED` | Missing/expired access token → refresh |
| 403 | `BU_NOT_AUTHORIZED` | Wrong `buGuid` |
| 403 | `SCOPE_DENIED` | Account can’t read this resource |
| 404 | `NOT_FOUND` | Unknown salesman / endpoint |
| 429 | `RATE_LIMITED` | Slow down (`Retry-After`) |
| 503 | — | Service unavailable |

**Rate limits (docs):**
- `/auth/*`: 10 req/min per IP
- Data: ~60 req/min per account  
Cache `/bu` and `/party` — they rarely change.

Every response may include `X-Request-Id` — quote it when reporting bugs to them.

---

## Recommended client flow

```text
POST /auth/token
  → GET /bu                         (cache buGuids)
  → GET /party?buGuid=...           (cache partyCodes)
  → for each party + date:
        GET /booking-order          → Present if booked
        GET /booking-route          → TaTrips from areas[]
  → before accessToken expires (~14 min): POST /auth/refresh
```

---

## Postman quick checklist

1. Login → No Auth → copy `accessToken`
2. `/bu` → Bearer Token
3. `/party?buGuid=...&partyType=salesman` → Bearer
4. `/booking-order?buGuid=...&salesmanId=...&date=YYYY-MM-DD` → Bearer
5. `/booking-route?buGuid=...&salesmanId=...&date=YYYY-MM-DD` → Bearer

---

## Payroll / HR rules (owner — locked)

### Salary
- **Per-day salary × present days in the month** (not full fixed monthly lump ignoring absences).
- If someone takes off / absent → that day is **not paid** (cut from month).
- Formula direction:
  ```text
  dailyRate = monthlyBasic / workingDaysInMonth   // divisor set by EMS operator
  salaryPart = dailyRate × payableDays
  net ≈ salaryPart + manual TA − other deductions
  ```
- **Operator decides settings in software** (not hardcoded): e.g. working days in month (26 / 30 / calendar), and other payroll knobs we expose in Settings. Accounts policy can change without a code deploy.

### Employee codes (EMS operator assigns)
- Format locked: **`THT-1`, `THT-2`, …** — branch prefix + number, **no leading zeros** (`THT-01` not used).
- Assigned in EMS by operator (not only from SMDS).
- **Unique per branch** — if `THT-2` taken, another Thatta employee cannot get `2`.
- SMDS `partyCode` (e.g. `8000001`) stays a **separate mapping field** (`smdsPartyCode`); EMS display ID stays `THT-n`.
- Matches existing `Employee.employeeId` validation.

### Field location / field app
- **Not needed** for go-live. Owner originally asked for an app; now SMDS API covers field attendance.
- Park `field-app/` and Live Tracking as non-critical. Office = biometric agent; field = first order via SMDS.

### TA
- Manual entry by payroll operators (employee + date + amount → add to salary). See TA rule above.

### Still optional to confirm
- Who can enter TA (roles)?
- Default working-days value to ship with (operator can change later)

---

## Phase 1 built in EMS (Nov 2026)

What operators should configure for **Thatta first**:

1. **Backend `.env`:** `SMDS_LOGIN_ID`, `SMDS_SECRET`, optional `SMDS_BASE_URL`
2. **Branch (Thatta):** set **SMDS business unit GUID**  
   `5ae92023-aad3-4932-accc-77dc89680648`
3. **Employees:** `THT-1`, `THT-2`… + **SMDS party code** (e.g. `8000001`) + basic salary / bank
4. **Attendance → Sync SMDS field** (or hourly job) → method `SMDS`, status Present
5. **Travel Allowance** menu → manual TA (date + amount)
6. **Settings → Payroll rules** → working days in month (operator chooses divisor)

Payroll payslip run is **next phase** (not built yet).

---

## Rollout plan (owner direction)

**Branch-by-branch go-live — do not launch all BUs at once.**

| Phase | BU | Location | Status |
|-------|-----|----------|--------|
| 1 | **THT** | Thatta | **First** — employees, mapping, TA, sync, payroll |
| 2 | **MPK** | Mirpurkhas | After Thatta is stable |
| 3 | **SHD** | Shahdadpur | Later |
| ? | Hyderabad | — | Not in current `/bu` list; ask SMDS if needed |

EMS sync / payroll should be **filterable by branch (`buGuid`)** so Phase 1 only processes THT.

---

## Live smoke test — 2026-11-03 (Step 2)

Base: `https://sds.adilagencies.net/api/integration/v1`  
All three endpoints **OK**.

### `/party` — salesman counts

| BU | Salesmen | Sample `partyCode` |
|----|----------|--------------------|
| MPK | 7 | `8000001` WAJAHAT, `8000002` SAIF ULLAH, … |
| THT | 4 | `8000001` ZULFIQAR, `8000005` INAYATULLAH AHMED, … |
| SHD | 5 | `8000001` CASH COUNTER, `8000002` FARMAN, … |

Deliveryman (THT): `7000001` MUHAMMAD FAISAL, `7000002` KAMIL FAQEER ZADA

**Important:** `partyCode` like `8000001` repeats across BUs (different people).  
EMS mapping must be **`buGuid` + `partyCode`**, not `partyCode` alone.  
Docs examples used `S-0012`; live codes are numeric (`8000…` / `7000…`).

Also filter noise for payroll: names like **Cash Counter**, **AVAILABILITY** may not be real field staff.

### `/booking-order` — today

| BU | salesmanId | orderStatus | firstOrderAt (UTC) | orders |
|----|------------|-------------|--------------------|--------|
| MPK | 8000001 | **booked** | 2026-11-03T06:49:17.000Z | 48 |
| THT | 8000001 | **booked** | 2026-11-03T05:05:23.000Z | 41 |
| SHD | 8000001 | **no order** | null | 0 |

→ Attendance rule works: booked = Present, no order = skip.

### `/booking-route` — today

| BU | salesmanId | routeName | areas |
|----|------------|-----------|-------|
| MPK | 8000001 | WS | 11 (WHOLE SALE, HIRABAD, TOURABAD, MPK AREA, …) |
| THT | 8000001 | GHARO / GUJO / DHABE / G-PHATAK | 4 (GUJJO, GHARO, DHABEJI, GHAGHAR PHATAK) |
| SHD | 8000001 | null | 0 |

→ TA master should key on `areaCode` (e.g. `070110001`) + `areaName`.  
Same-day multiple areas = sum TA (company rule).
