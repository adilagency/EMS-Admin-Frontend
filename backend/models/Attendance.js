import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    date: { type: String, required: true },
    checkIn: { type: String, default: "--" },
    checkOut: { type: String, default: "--" },
    hours: { type: String, default: "--" },
    method: {
      type: String,
      enum: ["Biometric", "GPS", "Manual", "SMDS", "--"],
      default: "--",
    },
    /** Optional note for manual entry (power outage, device down, etc.) */
    note: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Working", "On Leave"],
      required: true,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ company: 1, employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
