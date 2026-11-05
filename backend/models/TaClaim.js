import mongoose from "mongoose";

/**
 * Manual travel allowance entry by payroll operators.
 * Example: employee took a bus, claimed Rs 600 for that date → added to salary.
 */
const taClaimSchema = new mongoose.Schema(
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
    /** YYYY-MM-DD (company / Pakistan calendar day) */
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

taClaimSchema.index({ company: 1, employee: 1, date: 1 });
taClaimSchema.index({ company: 1, date: 1 });

export default mongoose.model("TaClaim", taClaimSchema);
