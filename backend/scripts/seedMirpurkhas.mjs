/**
 * Create / update Mirpurkhas branch + roster from
 * MIRPURKHAS EMPLOYES DETAIL.xlsx (+ bank from OCT salary sheet)
 *
 * Field (Excel + SMDS salesman): Order Taker + smdsPartyCode
 * Delivery (Excel + SMDS deliveryman): Office Staff / biometric — no field app
 * Skip SMDS-only test/dev: Cash Counter, Availability, Azhar Khan salesman
 * Keep sheet accountant SYED AZHAR ALI (office staff)
 *
 * Usage: node scripts/seedMirpurkhas.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Employee from "../models/Employee.js";

dotenv.config();

const MPK_BU_GUID = "2fa5c6c5-c7b0-4236-9ecb-8c9adeca6cb7";

/** monthly TA/DA ÷ 30 → dailyAllowance (Thatta OCT pattern) */
const da = (monthly) => Math.round((Number(monthly) / 30) * 100) / 100;

const STAFF = [
  {
    employeeId: "MPK-1",
    devicePin: "201",
    name: "SALMAN SHAIKH",
    designation: "Branch Manager",
    role: "Office Staff",
    department: "Management",
    phone: "03313724220",
    bankAccountNumber: "PK31ALFH5637005002909623",
    smdsPartyCode: "",
    basicSalary: 62200,
    dailyAllowance: da(800),
  },
  {
    employeeId: "MPK-2",
    devicePin: "202",
    name: "SYED AZHAR ALI",
    designation: "Accountant / Cash",
    role: "Office Staff",
    department: "Accounts",
    phone: "03332974602",
    bankAccountNumber: "PK89ALFH5637005002779763",
    smdsPartyCode: "",
    basicSalary: 38950,
    dailyAllowance: 0,
  },
  {
    employeeId: "MPK-3",
    devicePin: "203",
    name: "AMJAD MAJEED",
    designation: "Store Incharge",
    role: "Office Staff",
    department: "Store",
    phone: "03163145775",
    bankAccountNumber: "PK52ALFH5637005002923116",
    smdsPartyCode: "",
    basicSalary: 32200,
    dailyAllowance: 0,
  },
  {
    employeeId: "MPK-4",
    devicePin: "204",
    name: "SALMAN RASHEED",
    designation: "Store Assistant",
    role: "Office Staff",
    department: "Store",
    phone: "03332974602",
    bankAccountNumber: "PK84ALFH5637005003007609",
    smdsPartyCode: "",
    basicSalary: 21700,
    dailyAllowance: 0,
  },
  {
    employeeId: "MPK-5",
    devicePin: "205",
    name: "LAJPAT RAI",
    designation: "O/S Sales Man (Umerkot)",
    role: "Order Taker",
    department: "Sales",
    phone: "03313738923",
    bankAccountNumber: "PK79ALFH0422001011340440",
    smdsPartyCode: "8000003",
    basicSalary: 23880,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "MPK-6",
    devicePin: "206",
    name: "WAJAHAT RASOOL",
    designation: "Local Salesman (W/Sale)",
    role: "Order Taker",
    department: "Sales",
    phone: "03163545191",
    bankAccountNumber: "PK38ALFH5637005002923077",
    smdsPartyCode: "8000001",
    basicSalary: 20400,
    dailyAllowance: da(2600),
  },
  {
    employeeId: "MPK-7",
    devicePin: "207",
    name: "SAIFULLAH KHAN",
    designation: "O/S Sales Man",
    role: "Order Taker",
    department: "Sales",
    phone: "03308363431",
    bankAccountNumber: "PK59ALFH5637005002928325",
    smdsPartyCode: "8000002",
    basicSalary: 21000,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "MPK-8",
    devicePin: "208",
    name: "ASFAND YAR",
    designation: "O/S Sales Man",
    role: "Order Taker",
    department: "Sales",
    phone: "03188146640",
    bankAccountNumber: "PK79ALFH5637005002780719",
    smdsPartyCode: "8000006",
    basicSalary: 20700,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "MPK-9",
    devicePin: "209",
    name: "NAUSHAD AHMED KHAN",
    designation: "Local Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "03322810617",
    bankAccountNumber: "PK78ALFH5637005002782386",
    smdsPartyCode: "",
    basicSalary: 20700,
    dailyAllowance: da(2600),
  },
  {
    employeeId: "MPK-10",
    devicePin: "210",
    name: "UBAID HAFIZ",
    designation: "O/S Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "03123824782",
    bankAccountNumber: "PK60ALFH0132001011299410",
    smdsPartyCode: "",
    basicSalary: 20200,
    dailyAllowance: da(3600),
  },
  {
    employeeId: "MPK-11",
    devicePin: "211",
    name: "KASHIF HUSSAIN",
    designation: "O/S Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "03168020992",
    bankAccountNumber: "PK63ALFH5637005002928447",
    smdsPartyCode: "",
    basicSalary: 22200,
    dailyAllowance: da(3600),
  },
  {
    employeeId: "MPK-12",
    devicePin: "212",
    name: "MUHAMMAD SALMAN",
    designation: "O/S Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "03133177746",
    bankAccountNumber: "PK58ALFH5637005003007592",
    smdsPartyCode: "",
    basicSalary: 20700,
    dailyAllowance: da(3600),
  },
  {
    employeeId: "MPK-13",
    devicePin: "213",
    name: "IKHLAQUE HUSSAIN",
    designation: "O/S Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "03133319484",
    bankAccountNumber: "PK74ALFH5637005002928443",
    smdsPartyCode: "",
    basicSalary: 20700,
    dailyAllowance: da(3600),
  },
  {
    employeeId: "MPK-14",
    devicePin: "214",
    name: "MUHAMMAD RAMZAN",
    designation: "Driver (Shahzor KZ-4973)",
    role: "Office Staff",
    department: "Transport",
    phone: "03313711791",
    bankAccountNumber: "PK69ALFH5637005002928436",
    smdsPartyCode: "",
    basicSalary: 22700,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "MPK-15",
    devicePin: "215",
    name: "IFTIKHAR HUSSAIN",
    designation: "Office Peon",
    role: "Office Staff",
    department: "Support",
    phone: "03133177694",
    bankAccountNumber: "PK22ALFH0132001011371597",
    smdsPartyCode: "",
    basicSalary: 20800,
    dailyAllowance: 0,
  },
  {
    employeeId: "MPK-16",
    devicePin: "216",
    name: "NADIR",
    designation: "Sweeper",
    role: "Office Staff",
    department: "Support",
    phone: "03123019476",
    bankAccountNumber: "PK22ALFH0132001011331328",
    smdsPartyCode: "",
    basicSalary: 8000,
    dailyAllowance: 0,
  },
];

const run = async () => {
  try {
    await connectDB();

    const company = await Company.findOne({ email: "owner@adilagencies.com" });
    if (!company) {
      throw new Error("Company not found. Run seed or create company first.");
    }

    let branch = await Branch.findOne({
      company: company._id,
      cityCode: "MPK",
    });

    if (!branch) {
      branch = await Branch.create({
        company: company._id,
        name: "Mirpurkhas Branch",
        code: "MPK-01",
        cityCode: "MPK",
        city: "Mirpurkhas",
        address: "Plot No.C/S 442, A3, Umerkot Road, Mirpurkhas",
        manager: "SALMAN SHAIKH",
        status: "Active",
        smdsBuGuid: MPK_BU_GUID,
      });
      console.log(`Created branch: ${branch.name}`);
    } else {
      branch.smdsBuGuid = MPK_BU_GUID;
      branch.name = "Mirpurkhas Branch";
      branch.code = branch.code || "MPK-01";
      branch.city = "Mirpurkhas";
      branch.address =
        branch.address ||
        "Plot No.C/S 442, A3, Umerkot Road, Mirpurkhas";
      branch.manager = "SALMAN SHAIKH";
      branch.status = "Active";
      await branch.save();
      console.log(`Updated branch: ${branch.name}`);
    }

    // Remove SMDS salesman Azhar Khan if mistakenly added (not sheet accountant)
    const badAzhar = await Employee.find({
      company: company._id,
      branch: branch._id,
      $or: [
        { smdsPartyCode: "8000004" },
        { name: /^azhar khan/i },
      ],
    });
    for (const a of badAzhar) {
      await a.deleteOne();
      console.log("Removed SMDS/dev Azhar Khan:", a.employeeId, a.name);
    }

    for (const s of STAFF) {
      let emp = await Employee.findOne({
        company: company._id,
        employeeId: s.employeeId,
      });

      if (!emp) {
        emp = await Employee.findOne({
          company: company._id,
          branch: branch._id,
          name: new RegExp(`^${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
      }

      const fields = {
        company: company._id,
        branch: branch._id,
        employeeId: s.employeeId,
        devicePin: s.devicePin,
        name: s.name,
        phone: s.phone || "",
        cnic: s.cnic || "",
        designation: s.designation,
        department: s.department || "",
        role: s.role,
        status: "Active",
        smdsPartyCode: s.smdsPartyCode || "",
        bankName: "Bank AL Habib",
        bankAccountTitle: s.name,
        bankAccountNumber: s.bankAccountNumber || "",
        basicSalary: s.basicSalary ?? emp?.basicSalary ?? 0,
        dailyAllowance: s.dailyAllowance ?? emp?.dailyAllowance ?? 0,
      };

      if (emp) {
        Object.assign(emp, fields);
        if (s.role === "Order Taker" || s.role === "Dispatcher") {
          if (!emp.hasFieldPassword) emp.fieldPassword = "mpk12345";
        } else {
          emp.fieldPassword = "";
          emp.hasFieldPassword = false;
        }
        await emp.save();
        console.log(
          `Updated ${s.employeeId} ${s.name} role=${s.role} smds=${s.smdsPartyCode || "-"} sal=${s.basicSalary} da=${s.dailyAllowance}`
        );
      } else {
        await Employee.create({
          ...fields,
          ...(s.role === "Order Taker" || s.role === "Dispatcher"
            ? { fieldPassword: "mpk12345" }
            : { fieldPassword: "", hasFieldPassword: false }),
          workSchedule: {
            start: "08:30 AM",
            end: "05:30 PM",
            lateThresholdMinutes: 15,
            halfDayHours: 4,
            fullDayHours: 8,
            workingDays: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
        });
        console.log(
          `Created ${s.employeeId} ${s.name} role=${s.role} smds=${s.smdsPartyCode || "-"} sal=${s.basicSalary} da=${s.dailyAllowance}`
        );
      }
    }

    const count = await Employee.countDocuments({
      company: company._id,
      branch: branch._id,
      status: "Active",
    });
    console.log(
      `\nMirpurkhas roster ready (${count} staff). Skipped Cash Counter / Availability / Azhar Khan salesman.`
    );
    await mongoose.disconnect();
  } catch (err) {
    console.error("seedMirpurkhas failed:", err);
    process.exit(1);
  }
};

run();
