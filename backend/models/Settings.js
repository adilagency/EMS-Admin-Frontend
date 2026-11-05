import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    officeTimings: {
      start: { type: String, default: "09:00 AM" },
      end: { type: String, default: "06:00 PM" },
    },
    workingDays: {
      type: [String],
      default: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    attendanceRules: {
      lateThresholdMinutes: { type: Number, default: 15 },
      halfDayHours: { type: Number, default: 4 },
      fullDayHours: { type: Number, default: 8 },
    },
    gpsRules: {
      refreshIntervalSeconds: { type: Number, default: 30 },
      offlineTimeoutMinutes: { type: Number, default: 15 },
    },
    alertSettings: {
      absentAlert: { type: Boolean, default: true },
      lateAlert: { type: Boolean, default: true },
      gpsDisabledAlert: { type: Boolean, default: true },
      offlineAlert: { type: Boolean, default: true },
      lowBatteryAlert: { type: Boolean, default: true },
      lowBatteryThreshold: { type: Number, default: 35 },
    },
    /** Operator-configurable payroll knobs */
    payrollRules: {
      /** Divisor for daily rate: basicSalary / workingDaysInMonth */
      workingDaysInMonth: { type: Number, default: 26, min: 1, max: 31 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
