/**
 * Create Thatta branch + roster from owner sheet.
 * Field: Sales Officer / Sales Man / Booker → Order Taker + SMDS where known.
 * Azhar Khan (SDS developer) is NOT an employee.
 *
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

const STAFF = [
  {
    employeeId: "THT-1",
    devicePin: "101",
    name: "SALMAN KHAN",
    designation: "Branch Manager",
    role: "Office Staff",
    department: "Management",
    bankName: "Bank AL Habib",
    bankAccountNumber: "PK46ALFH5637005002748333",
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
    bankName: "Bank AL Habib",
    bankAccountNumber: "PK62ALFH5637005003004610",
    cnic: "41409-7523326-5",
    phone: "0321-9488931",
    smdsPartyCode: "8000001",
  },
  {
    employeeId: "THT-3",
    devicePin: "103",
    name: "KAMIL FAQEER ZADA",
    designation: "Delivery",
    role: "Office Staff",
    department: "Delivery",
    bankName: "Bank AL Habib",
    bankAccountNumber: "PK96ALFH5637005003004580",
    cnic: "41409-3269099-1",
    phone: "0308-7614144",
    smdsPartyCode: "",
  },
  {
    employeeId: "THT-4",
    devicePin: "104",
    name: "MUHAMMAD FAISAL",
    designation: "Delivery",
    role: "Office Staff",
    department: "Delivery",
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
    cnic: "41409-5274261-3",
    phone: "0328-3544090",
    smdsPartyCode: "",
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
        manager: "SALMAN KHAN",
        phone: "0331-3223900",
        status: "Active",
        smdsBuGuid: THT_BU_GUID,
      });
      console.log(`Created branch: ${branch.name}`);
    } else {
      branch.smdsBuGuid = THT_BU_GUID;
      branch.manager = "SALMAN KHAN";
      await branch.save();
      console.log(`Updated branch: ${branch.name}`);
    }

    // Remove SDS developer if present
    const azhar = await Employee.find({
      company: company._id,
      branch: branch._id,
      name: /azhar/i,
    });
    for (const a of azhar) {
      await a.deleteOne();
      console.log("Removed developer (not staff):", a.employeeId, a.name);
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
          name: new RegExp(`^${s.name.split(" ")[0]}`, "i"),
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
        bankName: s.bankName || "",
        bankAccountTitle: s.name,
        bankAccountNumber: s.bankAccountNumber || "",
        basicSalary: emp?.basicSalary ?? 0,
        dailyAllowance: emp?.dailyAllowance ?? 0,
      };

      if (emp) {
        Object.assign(emp, fields);
        if (
          (s.role === "Order Taker" || s.role === "Dispatcher") &&
          !emp.hasFieldPassword
        ) {
          emp.fieldPassword = "tht12345";
        }
        await emp.save();
        console.log(`Updated ${s.employeeId} ${s.name}`);
      } else {
        await Employee.create({
          ...fields,
          ...(s.role === "Order Taker" || s.role === "Dispatcher"
            ? { fieldPassword: "tht12345" }
            : {}),
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
        console.log(`Created ${s.employeeId} ${s.name}`);
      }
    }

    console.log("\nThatta roster ready (7 staff). Azhar Khan not included.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("seedThatta failed:", err);
    process.exit(1);
  }
};

run();
