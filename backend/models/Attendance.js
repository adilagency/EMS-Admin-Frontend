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
    /** SMDS first-order snapshot (attendance mark) */
    smdsFirstOrderNo: { type: String, trim: true, default: "" },
    smdsFirstOrderAt: { type: String, trim: true, default: "" },
    smdsFirstOrderArea: { type: String, trim: true, default: "" },
    smdsFirstOrderAreaCode: { type: String, trim: true, default: "" },
    /** SMDS day plan from /booking-route */
    smdsRouteName: { type: String, trim: true, default: "" },
    smdsRouteAreas: [
      {
        areaCode: { type: String, trim: true, default: "" },
        areaName: { type: String, trim: true, default: "" },
      },
    ],
    /** All SMDS orders that day (slim) */
    smdsOrderCount: { type: Number, default: 0 },
    smdsOrders: [
      {
        orderNo: { type: String, trim: true, default: "" },
        orderDateTime: { type: String, trim: true, default: "" },
        customerName: { type: String, trim: true, default: "" },
        area: { type: String, trim: true, default: "" },
        areaCode: { type: String, trim: true, default: "" },
        gps: {
          lat: { type: Number, default: null },
          lng: { type: Number, default: null },
        },
      },
    ],
  },
  { timestamps: true }
);

attendanceSchema.index({ company: 1, employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
