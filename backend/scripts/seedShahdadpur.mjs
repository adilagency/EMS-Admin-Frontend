/**
 * Create / update Shahdadpur branch + roster from
 * Employee List of Shadadpur Branch.xlsx
 *
 * Field (Excel + SMDS salesman): Order Taker + smdsPartyCode
 * Delivery (Excel + SMDS deliveryman): Office Staff / biometric — no field app
 * Skip SMDS-only test: Cash Counter, Availability, Default Deliveryman
 *
 * DA column is monthly → dailyAllowance = DA / 30
 * TA stays separate (claims), not folded into DA
 *
 * Usage: node scripts/seedShahdadpur.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Employee from "../models/Employee.js";

dotenv.config();

const SHD_BU_GUID = "4fd20560-feb5-4d4d-a762-0dd2591fdc14";

/** monthly DA ÷ 30 → dailyAllowance */
const da = (monthly) =>
  Math.round(((Number(monthly) || 0) / 30) * 100) / 100;

const STAFF = [
  {
    employeeId: "SHD-1",
    devicePin: "301",
    name: "ARIF HUSSAIN GHORI",
    designation: "Branch Manager",
    role: "Office Staff",
    department: "Management",
    phone: "0300-9375533",
    smdsPartyCode: "",
    basicSalary: 55000,
    dailyAllowance: da(30000),
  },
  {
    employeeId: "SHD-2",
    devicePin: "302",
    name: "MUHAMMAD SAQIB",
    designation: "IT",
    role: "Office Staff",
    department: "IT",
    phone: "0316-1740794",
    smdsPartyCode: "",
    basicSalary: 27000,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-3",
    devicePin: "303",
    name: "RANA ABDUL QAYOOM",
    designation: "WHI",
    role: "Office Staff",
    department: "Warehouse",
    phone: "0312-2722777",
    smdsPartyCode: "",
    basicSalary: 28000,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-4",
    devicePin: "304",
    name: "MUHAMMAD AWAIS",
    designation: "Store Helper",
    role: "Office Staff",
    department: "Store",
    phone: "0313-3903834",
    smdsPartyCode: "",
    basicSalary: 23500,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-5",
    devicePin: "305",
    name: "MUHAMMAD BILAL",
    designation: "Store Helper",
    role: "Office Staff",
    department: "Store",
    phone: "0316-3789690",
    smdsPartyCode: "",
    basicSalary: 25500,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-6",
    devicePin: "306",
    name: "DANISH",
    designation: "Store Helper",
    role: "Office Staff",
    department: "Store",
    phone: "0304-3270023",
    smdsPartyCode: "",
    basicSalary: 22000,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-7",
    devicePin: "307",
    name: "ALI AFZAL",
    designation: "Store Helper",
    role: "Office Staff",
    department: "Store",
    phone: "0329-8172926",
    smdsPartyCode: "",
    basicSalary: 22000,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-8",
    devicePin: "308",
    name: "ASADULLAH IMTIAZ",
    designation: "Sales Man",
    role: "Order Taker",
    department: "Sales",
    phone: "0310-3807530",
    smdsPartyCode: "8000003",
    basicSalary: 21820,
    dailyAllowance: da(4680),
  },
  {
    employeeId: "SHD-9",
    devicePin: "309",
    name: "MUHAMMAD FARMAN",
    designation: "Sales Man",
    role: "Order Taker",
    department: "Sales",
    phone: "0308-1230066",
    smdsPartyCode: "8000002",
    basicSalary: 21000,
    dailyAllowance: da(4680),
  },
  {
    employeeId: "SHD-10",
    devicePin: "310",
    name: "SOHAIL AHMED",
    designation: "Sales Man",
    role: "Order Taker",
    department: "Sales",
    phone: "0315-0300980",
    smdsPartyCode: "8000005",
    basicSalary: 24200,
    dailyAllowance: da(4680),
  },
  {
    employeeId: "SHD-11",
    devicePin: "311",
    name: "MUHAMMAD OWAIS",
    designation: "Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "0310-2816923",
    smdsPartyCode: "",
    basicSalary: 21600,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "SHD-12",
    devicePin: "312",
    name: "ASHOK KUMAR",
    designation: "Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "0306-8099935",
    smdsPartyCode: "",
    basicSalary: 24100,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "SHD-13",
    devicePin: "313",
    name: "SHAHBAZ ALI",
    designation: "Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "0315-4188630",
    smdsPartyCode: "",
    basicSalary: 22600,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "SHD-14",
    devicePin: "314",
    name: "ISHAQUE",
    designation: "Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "0319-2083099",
    smdsPartyCode: "",
    basicSalary: 21100,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "SHD-15",
    devicePin: "315",
    name: "HASNAIN",
    designation: "Delivery Man",
    role: "Office Staff",
    department: "Delivery",
    phone: "0302-3040118",
    smdsPartyCode: "",
    basicSalary: 21100,
    dailyAllowance: da(3900),
  },
  {
    employeeId: "SHD-16",
    devicePin: "316",
    name: "IMRAN ALI",
    designation: "Driver",
    role: "Office Staff",
    department: "Transport",
    phone: "0302-3022032",
    smdsPartyCode: "",
    basicSalary: 25500,
    dailyAllowance: da(2600),
  },
  {
    employeeId: "SHD-17",
    devicePin: "317",
    name: "MUHAMMAD FAHEEM",
    designation: "Peon",
    role: "Office Staff",
    department: "Support",
    phone: "0309-2312176",
    smdsPartyCode: "",
    basicSalary: 19500,
    dailyAllowance: 0,
  },
  {
    employeeId: "SHD-18",
    devicePin: "318",
    name: "SAGAR",
    designation: "Cleaner",
    role: "Office Staff",
    department: "Support",
    phone: "0315-1308535",
    smdsPartyCode: "",
    basicSalary: 11000,
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
      cityCode: "SHD",
    });

    if (!branch) {
      branch = await Branch.create({
        company: company._id,
        name: "Shahdadpur Branch",
        code: "SHD-01",
        cityCode: "SHD",
        city: "Shahdadpur",
        address: "Tando Adam Road, Shahdadpur",
        manager: "ARIF HUSSAIN GHORI",
        phone: "0300-9375533",
        status: "Active",
        smdsBuGuid: SHD_BU_GUID,
      });
      console.log(`Created branch: ${branch.name}`);
    } else {
      branch.smdsBuGuid = SHD_BU_GUID;
      branch.name = "Shahdadpur Branch";
      branch.code = branch.code || "SHD-01";
      branch.city = "Shahdadpur";
      branch.address = branch.address || "Tando Adam Road, Shahdadpur";
      branch.manager = "ARIF HUSSAIN GHORI";
      branch.phone = "0300-9375533";
      branch.status = "Active";
      await branch.save();
      console.log(`Updated branch: ${branch.name}`);
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
          name: new RegExp(
            `^${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
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
        bankName: "",
        bankAccountTitle: s.name,
        bankAccountNumber: "",
        basicSalary: s.basicSalary ?? emp?.basicSalary ?? 0,
        dailyAllowance: s.dailyAllowance ?? emp?.dailyAllowance ?? 0,
      };

      if (emp) {
        Object.assign(emp, fields);
        if (s.role === "Order Taker" || s.role === "Dispatcher") {
          if (!emp.hasFieldPassword) emp.fieldPassword = "shd12345";
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
            ? { fieldPassword: "shd12345" }
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
    const field = await Employee.find({
      company: company._id,
      branch: branch._id,
      hasFieldPassword: true,
    })
      .select("employeeId name smdsPartyCode")
      .sort({ employeeId: 1 });

    console.log(`\nShahdadpur roster ready (${count} staff).`);
    console.log("Field app / SMDS Order Takers:");
    for (const e of field) {
      console.log(`  ${e.employeeId} ${e.name} smds=${e.smdsPartyCode}`);
    }
    console.log("Skipped SMDS test: Cash Counter, Availability, Default Deliveryman.");

    await mongoose.disconnect();
  } catch (err) {
    console.error("seedShahdadpur failed:", err);
    process.exit(1);
  }
};

run();
