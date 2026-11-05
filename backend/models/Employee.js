import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const EMPLOYEE_TYPES = ["Office Staff", "Order Taker", "Dispatcher"];
export const FIELD_EMPLOYEE_TYPES = ["Order Taker", "Dispatcher"];

/** Human-readable EMS ID: THT-1, KHI-12 (no leading zeros on the number) */
const EMPLOYEE_ID_RE = /^[A-Z]{2,5}-[1-9][0-9]*$/;

/** K50 device PIN: digits only, no leading zero */
const DEVICE_PIN_RE = /^[1-9][0-9]*$/;

const employeeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: (v) => EMPLOYEE_ID_RE.test(String(v || "")),
        message:
          "Employee ID must look like CITY-n (e.g. THT-1). No leading zeros.",
      },
    },
    /** Numeric PIN enrolled on ZKTeco K50 — digits only, no leading zero */
    devicePin: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => DEVICE_PIN_RE.test(String(v || "")),
        message:
          "Device PIN must be digits only with no leading zero (K50 rule).",
      },
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    image: { type: String, default: "" },
    /** Pakistan CNIC — digits / dashes, free-form length */
    cnic: { type: String, trim: true, default: "" },
    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    documents: [
      {
        type: {
          type: String,
          enum: ["cnic_image", "cv", "other"],
          required: true,
        },
        name: { type: String, trim: true, default: "" },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    designation: { type: String, trim: true },
    department: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: EMPLOYEE_TYPES,
      default: "Office Staff",
    },
    /**
     * Field app password (Order Taker / Dispatcher only).
     * Set only by company owner — never returned to clients.
     */
    fieldPassword: {
      type: String,
      select: false,
      default: "",
      validate: {
        validator: (v) => !v || String(v).length >= 6 || String(v).startsWith("$2"),
        message: "Field app password must be at least 6 characters",
      },
    },
    /** True when fieldPassword is set (safe to expose to admin UI). */
    hasFieldPassword: {
      type: Boolean,
      default: false,
    },
    /** Display string, kept in sync with workSchedule.start/end */
    shiftTiming: { type: String, trim: true },
    /** Per-employee attendance rules (used for late / hours). Settings are defaults only. */
    workSchedule: {
      start: { type: String, trim: true, default: "09:00 AM" },
      end: { type: String, trim: true, default: "06:00 PM" },
      lateThresholdMinutes: { type: Number, default: 15, min: 0 },
      halfDayHours: { type: Number, default: 4, min: 0 },
      fullDayHours: { type: Number, default: 8, min: 1 },
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
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    joiningDate: { type: Date },
    /** Monthly basic salary (PKR). Payroll uses per-day = basic / workingDaysInMonth. */
    basicSalary: { type: Number, default: 0, min: 0 },
    bankName: { type: String, trim: true, default: "" },
    bankAccountTitle: { type: String, trim: true, default: "" },
    bankAccountNumber: { type: String, trim: true, default: "" },
    /**
     * SMDS partyCode for field attendance sync (e.g. 8000001).
     * Unique per company+branch — same code can exist in another BU.
     */
    smdsPartyCode: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

employeeSchema.index({ company: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ company: 1, devicePin: 1 }, { unique: true });
employeeSchema.index(
  { company: 1, branch: 1, smdsPartyCode: 1 },
  {
    unique: true,
    partialFilterExpression: { smdsPartyCode: { $gt: "" } },
  }
);

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("fieldPassword")) return next();
  if (!this.fieldPassword) {
    this.hasFieldPassword = false;
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.fieldPassword = await bcrypt.hash(this.fieldPassword, salt);
  this.hasFieldPassword = true;
  next();
});

employeeSchema.methods.compareFieldPassword = function (candidate) {
  if (!this.fieldPassword) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.fieldPassword);
};

employeeSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.fieldPassword;
  obj.hasFieldPassword = Boolean(this.hasFieldPassword);
  return obj;
};

/** Strip password hash from lean docs / populated results */
export const sanitizeEmployee = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete obj.fieldPassword;
  obj.hasFieldPassword = Boolean(obj.hasFieldPassword);
  return obj;
};

export { EMPLOYEE_ID_RE, DEVICE_PIN_RE };
export default mongoose.model("Employee", employeeSchema);
