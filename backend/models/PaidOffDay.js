import mongoose from "mongoose";

/**
 * Company or branch paid-off day (public holiday, strike, etc.).
 * Counts toward payroll payableDays so salary + DA are not cut.
 * branch = null → applies to all branches.
 */
const paidOffDaySchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    /** YYYY-MM-DD */
    date: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Public Holiday", "Strike", "Other"],
      default: "Public Holiday",
    },
    note: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
  },
  { timestamps: true }
);

paidOffDaySchema.index(
  { company: 1, date: 1, branch: 1 },
  { unique: true }
);
paidOffDaySchema.index({ company: 1, date: 1 });

export default mongoose.model("PaidOffDay", paidOffDaySchema);
