/**
 * Wipe operational dummy/seed data. Keeps company login + settings.
 * Usage: node scripts/clearDummyData.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";
import Settings from "../models/Settings.js";
import Branch from "../models/Branch.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Tracking from "../models/Tracking.js";
import Alert from "../models/Alert.js";
import BranchDevice from "../models/BranchDevice.js";
import AttendanceLog from "../models/AttendanceLog.js";
import FieldSession from "../models/FieldSession.js";
import TaClaim from "../models/TaClaim.js";
import Deduction from "../models/Deduction.js";
import PayrollPeriod from "../models/PayrollPeriod.js";
import Payslip from "../models/Payslip.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const companies = await Company.find({}).select("companyName email").lean();
    console.log(
      "Companies kept:",
      companies.map((c) => `${c.companyName} <${c.email}>`).join(", ") || "(none)"
    );

    const results = await Promise.all([
      Branch.deleteMany({}),
      Employee.deleteMany({}),
      Attendance.deleteMany({}),
      Tracking.deleteMany({}),
      Alert.deleteMany({}),
      BranchDevice.deleteMany({}),
      AttendanceLog.deleteMany({}),
      FieldSession.deleteMany({}),
      TaClaim.deleteMany({}),
      Deduction.deleteMany({}),
      Payslip.deleteMany({}),
      PayrollPeriod.deleteMany({}),
    ]);

    const labels = [
      "branches",
      "employees",
      "attendance",
      "tracking",
      "alerts",
      "branchDevices",
      "attendanceLogs",
      "fieldSessions",
      "taClaims",
      "deductions",
      "payslips",
      "payrollPeriods",
    ];
    labels.forEach((name, i) => {
      console.log(`Deleted ${results[i].deletedCount} ${name}`);
    });

    // Ensure each company still has settings
    for (const c of companies) {
      const existing = await Settings.findOne({ company: c._id });
      if (!existing) {
        await Settings.create({ company: c._id });
        console.log(`Recreated settings for ${c.email}`);
      }
    }

    console.log("\nDone. Login still works. Add Thatta branch + real employees next.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Clear failed:", err);
    process.exit(1);
  }
};

run();
