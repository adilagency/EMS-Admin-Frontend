/**
 * Create Thatta branch + map SMDS salesmen (excludes Cash Counter).
 * Usage: node scripts/seedThatta.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Employee from "../models/Employee.js";

dotenv.config();

const THT_BU_GUID = "5ae92023-aad3-4932-accc-77dc89680648";

/** Real SMDS Thatta salesmen (not Cash Counter) */
const STAFF = [
  {
    employeeId: "THT-1",
    devicePin: "101",
    name: "ZULFIQAR",
    smdsPartyCode: "8000001",
    designation: "Order Taker",
    role: "Order Taker",
  },
  {
    employeeId: "THT-2",
    devicePin: "102",
    name: "Azhar Khan",
    smdsPartyCode: "8000003",
    designation: "Order Taker",
    role: "Order Taker",
  },
  {
    employeeId: "THT-3",
    devicePin: "103",
    name: "INAYATULLAH AHMED",
    smdsPartyCode: "8000005",
    designation: "Order Taker",
    role: "Order Taker",
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
      cityCode: "THT",
    });

    if (!branch) {
      branch = await Branch.create({
        company: company._id,
        name: "Thatta Branch",
        code: "THT-01",
        cityCode: "THT",
        city: "Thatta",
        address: "B-11 Unit #1 Hashimabad Housing Society Makli, Thatta",
        manager: "",
        phone: "",
        status: "Active",
        smdsBuGuid: THT_BU_GUID,
      });
      console.log(`Created branch: ${branch.name} (${branch.cityCode})`);
    } else {
      branch.smdsBuGuid = THT_BU_GUID;
      branch.name = branch.name || "Thatta Branch";
      branch.address =
        branch.address ||
        "B-11 Unit #1 Hashimabad Housing Society Makli, Thatta";
      await branch.save();
      console.log(`Updated branch: ${branch.name} — SMDS GUID set`);
    }

    for (const s of STAFF) {
      const existing = await Employee.findOne({
        company: company._id,
        employeeId: s.employeeId,
      });

      if (existing) {
        existing.smdsPartyCode = s.smdsPartyCode;
        existing.branch = branch._id;
        existing.name = s.name;
        existing.role = s.role;
        existing.designation = s.designation;
        existing.status = "Active";
        await existing.save();
        console.log(
          `Updated ${s.employeeId} → SMDS ${s.smdsPartyCode} (${s.name})`
        );
        continue;
      }

      await Employee.create({
        company: company._id,
        branch: branch._id,
        employeeId: s.employeeId,
        devicePin: s.devicePin,
        name: s.name,
        phone: "",
        designation: s.designation,
        department: "Sales",
        role: s.role,
        status: "Active",
        smdsPartyCode: s.smdsPartyCode,
        basicSalary: 0,
        fieldPassword: "tht12345",
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
        shiftTiming: "08:30 AM - 05:30 PM",
      });
      console.log(
        `Created ${s.employeeId} → SMDS ${s.smdsPartyCode} (${s.name})`
      );
    }

    console.log("\nThatta ready. Sync SMDS field on Attendance for today.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("seedThatta failed:", err);
    process.exit(1);
  }
};

run();
