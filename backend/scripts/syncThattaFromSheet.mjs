/**
 * Sync Thatta roster from owner sheet.
 * - Removes Azhar Khan (SDS developer, not an employee)
 * - Upserts the 7 sheet employees
 *
 * Usage: node scripts/syncThattaFromSheet.mjs
 */
import dotenv from "dotenv";

dotenv.config();

const API =
  process.env.EMS_API_URL?.replace(/\/$/, "") ||
  "https://ems-admin-r5m4.onrender.com/api";

const LOGIN = {
  email: process.env.EMS_OWNER_EMAIL || "owner@adilagencies.com",
  password: process.env.EMS_OWNER_PASSWORD || "admin123",
};

/** Owner sheet — THATTA EMPLOYEE DETAILS.xlsx */
const SHEET = [
  {
    employeeId: "THT-1",
    devicePin: "101",
    name: "SALMAN KHAN",
    designation: "Branch Manager",
    role: "Office Staff",
    department: "Management",
    bankAccountNumber: "PK46ALFH5637005002748333",
    bankName: "Bank AL Habib",
    cnic: "41409-2136361-7",
    phone: "0331-3223900",
    smdsPartyCode: "",
  },
  {
    employeeId: "THT-2",
    devicePin: "102",
    name: "ZULFIQAR ALI",
    designation: "Sales Officer",
    role: "Order Taker",
    department: "Sales",
    bankAccountNumber: "PK62ALFH5637005003004610",
    bankName: "Bank AL Habib",
    cnic: "41409-7523326-5",
    phone: "0321-9488931",
    smdsPartyCode: "8000001",
  },
  {
    employeeId: "THT-3",
    devicePin: "103",
    name: "KAMIL FAQEER ZADA",
    designation: "Delivery",
    role: "Dispatcher",
    department: "Delivery",
    bankAccountNumber: "PK96ALFH5637005003004580",
    bankName: "Bank AL Habib",
    cnic: "41409-3269099-1",
    phone: "0308-7614144",
    smdsPartyCode: "",
  },
  {
    employeeId: "THT-4",
    devicePin: "104",
    name: "MUHAMMAD FAISAL",
    designation: "Delivery",
    role: "Dispatcher",
    department: "Delivery",
    bankAccountNumber: "",
    bankName: "",
    cnic: "41409-1841252-2",
    phone: "0316-2992286",
    smdsPartyCode: "",
  },
  {
    employeeId: "THT-5",
    devicePin: "105",
    name: "URS WARIO",
    designation: "Sweeper",
    role: "Office Staff",
    department: "Support",
    bankAccountNumber: "",
    bankName: "",
    cnic: "41409-8011744-3",
    phone: "",
    smdsPartyCode: "",
  },
  {
    employeeId: "THT-6",
    devicePin: "106",
    name: "INAYATULLAH",
    designation: "Booker and Supplier",
    role: "Order Taker",
    department: "Sales",
    bankAccountNumber: "",
    bankName: "",
    cnic: "41409-9063343-5",
    phone: "0346-8969342",
    smdsPartyCode: "8000005",
  },
  {
    employeeId: "THT-7",
    devicePin: "107",
    name: "RIAZ HUSSAIN",
    designation: "Office Boy",
    role: "Office Staff",
    department: "Support",
    bankAccountNumber: "",
    bankName: "",
    cnic: "41409-5274261-3",
    phone: "0328-3544090",
    smdsPartyCode: "",
  },
];

const FIELD_PASSWORD = "tht12345";

const req = async (path, { method = "GET", token, body } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `${method} ${path} → ${res.status}`);
  }
  return data;
};

const payloadFromSheet = (row, branchId) => ({
  branch: branchId,
  employeeId: row.employeeId,
  devicePin: row.devicePin,
  name: row.name,
  designation: row.designation,
  role: row.role,
  department: row.department,
  bankName: row.bankName || "",
  bankAccountTitle: row.name,
  bankAccountNumber: row.bankAccountNumber || "",
  cnic: row.cnic || "",
  phone: row.phone || "",
  smdsPartyCode: row.smdsPartyCode || "",
  status: "Active",
  ...(row.role === "Order Taker" || row.role === "Dispatcher"
    ? { password: FIELD_PASSWORD }
    : {}),
});

const run = async () => {
  console.log("API:", API);
  const login = await req("/company/login", { method: "POST", body: LOGIN });
  const token = login.token;
  console.log("Logged in as", login.user?.companyName || login.user?.email);

  const branches = await req("/branches", { token });
  const tht = (branches.data || []).find((b) => b.cityCode === "THT");
  if (!tht) throw new Error("Thatta branch not found");
  console.log("Branch:", tht.name, tht._id);

  const empsRes = await req("/employees?branch=" + tht._id, { token });
  const existing = empsRes.data || [];
  console.log("Existing Thatta employees:", existing.length);

  // Remove SDS developer (not staff)
  const azhar = existing.find(
    (e) =>
      String(e.name || "")
        .toLowerCase()
        .includes("azhar") || e.employeeId === "THT-2"
  );
  // Only delete if it's Azhar — after renumber Zulfiqar may become THT-2
  const azharExact = existing.find((e) =>
    String(e.name || "")
      .toLowerCase()
      .includes("azhar")
  );
  if (azharExact) {
    await req(`/employees/${azharExact._id}`, { method: "DELETE", token });
    console.log("Deleted developer entry:", azharExact.employeeId, azharExact.name);
  } else {
    console.log("No Azhar Khan employee to delete");
  }

  // Reload after delete
  const afterDel = (await req("/employees?branch=" + tht._id, { token })).data || [];
  const byOldKey = new Map();
  for (const e of afterDel) {
    byOldKey.set(String(e.employeeId).toUpperCase(), e);
    byOldKey.set(String(e.name).toUpperCase().replace(/\s+/g, " "), e);
  }

  // To avoid unique collisions while renumbering, clear smds/codes via temp IDs first
  // Strategy: delete all remaining Thatta employees that are NOT matched by name to sheet,
  // then upsert sheet rows. Safer for small roster: delete all current Thatta staff, recreate.
  // But attendance is tied to employee _id — preserve Zulfiqar + Inayatullah docs by name match.

  const preserveByName = new Map();
  for (const e of afterDel) {
    const key = String(e.name || "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    preserveByName.set(key, e);
    // ZULFIQAR vs ZULFIQAR ALI
    if (key.startsWith("ZULFIQAR")) preserveByName.set("ZULFIQAR ALI", e);
    if (key.startsWith("INAYATULLAH")) preserveByName.set("INAYATULLAH", e);
  }

  // First pass: move existing preserved employees to temporary IDs/pins to free THT-n
  let tempN = 900;
  for (const e of afterDel) {
    const nameKey = String(e.name || "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    const isZulf =
      nameKey.includes("ZULFIQAR") || nameKey === "ZULFIQAR ALI";
    const isInayat = nameKey.includes("INAYATULLAH");
    if (!isZulf && !isInayat) {
      // unexpected leftover — delete
      await req(`/employees/${e._id}`, { method: "DELETE", token });
      console.log("Removed leftover:", e.employeeId, e.name);
      continue;
    }
    tempN += 1;
    await req(`/employees/${e._id}`, {
      method: "PUT",
      token,
      body: {
        employeeId: `THT-${tempN}`,
        devicePin: String(tempN),
        smdsPartyCode: "",
        name: e.name,
        role: e.role || "Order Taker",
        branch: tht._id,
      },
    });
    console.log(`Parked ${e.name} → THT-${tempN}`);
  }

  const parked =
    (await req("/employees?branch=" + tht._id, { token })).data || [];

  const findParked = (sheetName) => {
    const target = sheetName.toUpperCase();
    return parked.find((e) => {
      const n = String(e.name || "")
        .toUpperCase()
        .replace(/\s+/g, " ");
      if (target === "ZULFIQAR ALI") return n.includes("ZULFIQAR");
      if (target === "INAYATULLAH") return n.includes("INAYATULLAH");
      return n === target;
    });
  };

  for (const row of SHEET) {
    const body = payloadFromSheet(row, tht._id);
    const existingDoc = findParked(row.name);

    if (existingDoc) {
      await req(`/employees/${existingDoc._id}`, {
        method: "PUT",
        token,
        body: {
          ...body,
          // password only on create for field — update may accept password field
          ...(body.password ? { password: body.password } : {}),
        },
      });
      console.log("Updated", row.employeeId, row.name);
    } else {
      await req("/employees", { method: "POST", token, body });
      console.log("Created", row.employeeId, row.name);
    }
  }

  // Delete any leftover parked temps not in sheet
  const finalList =
    (await req("/employees?branch=" + tht._id, { token })).data || [];
  const sheetIds = new Set(SHEET.map((s) => s.employeeId));
  for (const e of finalList) {
    if (!sheetIds.has(e.employeeId)) {
      await req(`/employees/${e._id}`, { method: "DELETE", token });
      console.log("Cleaned leftover", e.employeeId, e.name);
    }
  }

  const done =
    (await req("/employees?branch=" + tht._id, { token })).data || [];
  console.log("\nThatta roster now:");
  for (const e of done.sort((a, b) =>
    String(a.employeeId).localeCompare(String(b.employeeId), undefined, {
      numeric: true,
    })
  )) {
    console.log(
      `${e.employeeId.padEnd(6)} ${e.name.padEnd(22)} ${String(e.role).padEnd(12)} pin=${e.devicePin} smds=${e.smdsPartyCode || "-"}`
    );
  }
  console.log(`\nTotal: ${done.length}`);
};

run().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
