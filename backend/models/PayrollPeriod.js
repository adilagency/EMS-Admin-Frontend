import mongoose from "mongoose";

const payrollPeriodSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    year: { type: Number, required: true, min: 2020, max: 2100 },
    /** 1–12 */
    month: { type: Number, required: true, min: 1, max: 12 },
    status: {
      type: String,
      enum: ["Draft", "Calculated", "Approved"],
      default: "Draft",
    },
    /** Snapshot of Settings.payrollRules.workingDaysInMonth at calculate time */
    workingDaysInMonthSnapshot: { type: Number, default: 26, min: 1, max: 31 },
    calculatedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

payrollPeriodSchema.index(
  { company: 1, branch: 1, year: 1, month: 1 },
  { unique: true }
);

export default mongoose.model("PayrollPeriod", payrollPeriodSchema);
