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

import { company } from "./data.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    console.log("Clearing operational collections...");
    await Promise.all([
      Company.deleteMany(),
      Settings.deleteMany(),
      Branch.deleteMany(),
      Employee.deleteMany(),
      Attendance.deleteMany(),
      Tracking.deleteMany(),
      Alert.deleteMany(),
      BranchDevice.deleteMany(),
      AttendanceLog.deleteMany(),
      FieldSession.deleteMany(),
      TaClaim.deleteMany(),
    ]);

    const createdCompany = await Company.create(company);
    await Settings.create({ company: createdCompany._id });

    console.log(`Seeded company: ${company.companyName}`);
    console.log("No dummy branches/employees (add real Thatta staff in admin).");
    console.log("\nLogin:");
    console.log(`  Email:    ${company.email}`);
    console.log(`  Password: ${company.password}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

run();
