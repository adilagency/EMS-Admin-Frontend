import mongoose from "mongoose";

const payslipSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    period: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollPeriod",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    /** Snapshots at calculate time — do not change if employee rates edit later */
    basicSalary: { type: Number, default: 0 },
    dailyAllowanceRate: { type: Number, default: 0 },
    payableDays: { type: Number, default: 0 },
    workingDaysInMonth: { type: Number, default: 26 },
    salaryPart: { type: Number, default: 0 },
    taTotal: { type: Number, default: 0 },
    daTotal: { type: Number, default: 0 },
    deductionTotal: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    employeeIdSnapshot: { type: String, default: "" },
    employeeNameSnapshot: { type: String, default: "" },
  },
  { timestamps: true }
);

payslipSchema.index({ company: 1, period: 1, employee: 1 }, { unique: true });

export default mongoose.model("Payslip", payslipSchema);
