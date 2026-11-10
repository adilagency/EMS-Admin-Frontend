import mongoose from "mongoose";

/**
 * Manual payroll deduction entry (advance, fine, unpaid leave cash, etc.).
 */
const deductionSchema = new mongoose.Schema(
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
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    /** YYYY-MM-DD */
    date: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
  },
  { timestamps: true }
);

deductionSchema.index({ company: 1, employee: 1, date: 1 });
deductionSchema.index({ company: 1, date: 1 });

export default mongoose.model("Deduction", deductionSchema);
