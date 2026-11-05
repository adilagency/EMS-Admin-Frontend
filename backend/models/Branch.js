import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    /** Short city code for employee IDs, e.g. THT, KHI, SKR */
    cityCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 5,
      match: [/^[A-Z]{2,5}$/, "City code must be 2–5 letters only"],
    },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    manager: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    openingDate: { type: Date },
    /** SMDS business unit GUID for field order sync (e.g. Thatta). */
    smdsBuGuid: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

branchSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
branchSchema.index({ company: 1, cityCode: 1 });

export default mongoose.model("Branch", branchSchema);
