import { useEffect, useRef, useState } from "react";
import { X, Camera, Upload } from "lucide-react";
import * as employeeService from "../../services/employeeService";
import * as settingsService from "../../services/settingsService";
import { compressImageFile, isValidPkPhone } from "../../utils/imageCompress";
import { notifyError, notifySuccess } from "../../utils/notify";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const defaultSchedule = {
  start: "09:00 AM",
  end: "06:00 PM",
  lateThresholdMinutes: 15,
  halfDayHours: 4,
  fullDayHours: 8,
  workingDays: WEEK_DAYS.slice(0, 6),
};

const FIELD_ROLES = ["Order Taker", "Dispatcher"];

const emptyForm = {
  name: "",
  employeeId: "",
  devicePin: "",
  phone: "",
  cnic: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  documents: [],
  branch: "",
  designation: "",
  department: "",
  role: "Office Staff",
  joiningDate: "",
  status: "Active",
  image: "",
  password: "",
  confirmPassword: "",
  resetPassword: false,
  basicSalary: "",
  bankName: "",
  bankAccountTitle: "",
  bankAccountNumber: "",
  smdsPartyCode: "",
  workSchedule: { ...defaultSchedule, workingDays: [...defaultSchedule.workingDays] },
};

const AddEmployeeDrawer = ({
  open,
  onClose,
  employee = null,
  branches = [],
  onSaved,
}) => {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [companyDefaults, setCompanyDefaults] = useState(defaultSchedule);
  const isEdit = Boolean(employee?._id);
  const isFieldRole = FIELD_ROLES.includes(form.role);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadDefaults = async () => {
      try {
        const settingsRes = await settingsService.getSettings();
        const data = settingsRes.data || {};
        const nextDefaults = {
          start: data.officeTimings?.start || defaultSchedule.start,
          end: data.officeTimings?.end || defaultSchedule.end,
          lateThresholdMinutes:
            data.attendanceRules?.lateThresholdMinutes ??
            defaultSchedule.lateThresholdMinutes,
          halfDayHours:
            data.attendanceRules?.halfDayHours ?? defaultSchedule.halfDayHours,
          fullDayHours:
            data.attendanceRules?.fullDayHours ?? defaultSchedule.fullDayHours,
          workingDays:
            data.workingDays?.length > 0
              ? data.workingDays
              : defaultSchedule.workingDays,
        };
        if (!cancelled) setCompanyDefaults(nextDefaults);
        return nextDefaults;
      } catch {
        return defaultSchedule;
      }
    };

    setError("");

    (async () => {
      const defaults = await loadDefaults();

      if (cancelled) return;

      if (employee) {
        const branchId =
          typeof employee.branch === "object"
            ? employee.branch?._id
            : employee.branch;

        const ws = employee.workSchedule || {};

        setForm({
          name: employee.name || "",
          employeeId: employee.employeeId || "",
          devicePin: employee.devicePin || "",
          phone: employee.phone || "",
          cnic: employee.cnic || "",
          emergencyContactName: employee.emergencyContactName || "",
          emergencyContactPhone: employee.emergencyContactPhone || "",
          documents: Array.isArray(employee.documents)
            ? employee.documents.map((d) => ({
                type: d.type,
                name: d.name || "",
                url: d.url,
                uploadedAt: d.uploadedAt,
              }))
            : [],
          branch: branchId || "",
          designation: employee.designation || "",
          department: employee.department || "",
          role: employee.role || "Office Staff",
          joiningDate: employee.joiningDate
            ? new Date(employee.joiningDate).toISOString().slice(0, 10)
            : "",
          status: employee.status || "Active",
          image: employee.image || "",
          password: "",
          confirmPassword: "",
          resetPassword: false,
          basicSalary:
            employee.basicSalary != null && employee.basicSalary !== ""
              ? String(employee.basicSalary)
              : "",
          bankName: employee.bankName || "",
          bankAccountTitle: employee.bankAccountTitle || "",
          bankAccountNumber: employee.bankAccountNumber || "",
          smdsPartyCode: employee.smdsPartyCode || "",
          workSchedule: {
            start: ws.start || defaults.start,
            end: ws.end || defaults.end,
            lateThresholdMinutes:
              ws.lateThresholdMinutes ?? defaults.lateThresholdMinutes,
            halfDayHours: ws.halfDayHours ?? defaults.halfDayHours,
            fullDayHours: ws.fullDayHours ?? defaults.fullDayHours,
            workingDays:
              ws.workingDays?.length > 0
                ? ws.workingDays
                : [...defaults.workingDays],
          },
        });
      } else {
        setForm({
          ...emptyForm,
          workSchedule: {
            ...defaults,
            workingDays: [...defaults.workingDays],
          },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [name]:
          name === "lateThresholdMinutes" ||
          name === "halfDayHours" ||
          name === "fullDayHours"
            ? Number(value)
            : value,
      },
    }));
  };

  const toggleWorkingDay = (day) => {
    setForm((prev) => {
      const days = prev.workSchedule.workingDays || [];
      const exists = days.includes(day);
      return {
        ...prev,
        workSchedule: {
          ...prev.workSchedule,
          workingDays: exists
            ? days.filter((d) => d !== day)
            : [...days, day],
        },
      };
    });
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file);
      setForm((prev) => ({ ...prev, image: compressed }));
    } catch (err) {
      notifyError(err.message || "Failed to process image.");
    } finally {
      e.target.value = "";
    }
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const handleDocument = async (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let url;
      let name = file.name;
      if (file.type.startsWith("image/")) {
        url = await compressImageFile(file, { maxSize: 1200, quality: 0.75 });
      } else if (
        file.type === "application/pdf" ||
        name.toLowerCase().endsWith(".pdf")
      ) {
        if (file.size > 8 * 1024 * 1024) {
          throw new Error("PDF must be under 8 MB.");
        }
        url = await readFileAsDataUrl(file);
      } else {
        throw new Error("Use an image or PDF file.");
      }

      setForm((prev) => {
        const withoutSame =
          docType === "other"
            ? prev.documents
            : (prev.documents || []).filter((d) => d.type !== docType);
        return {
          ...prev,
          documents: [
            ...withoutSame,
            { type: docType, name, url, uploadedAt: new Date().toISOString() },
          ],
        };
      });
      notifySuccess(
        docType === "cnic_image"
          ? "CNIC image added"
          : docType === "cv"
            ? "CV added"
            : "Document added"
      );
    } catch (err) {
      notifyError(err.message || "Failed to add document.");
    } finally {
      e.target.value = "";
    }
  };

  const removeDocument = (index) => {
    setForm((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index),
    }));
  };

  const docLabel = (type) => {
    if (type === "cnic_image") return "CNIC image";
    if (type === "cv") return "CV";
    return "Other";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.branch || !form.designation) {
      setError("Name, phone, branch and designation are required.");
      return;
    }

    const phone = form.phone.trim();
    if (!isValidPkPhone(phone)) {
      setError("Invalid number. Enter a correct 11-digit number starting with 03.");
      notifyError("Invalid number. Enter a correct 11-digit number starting with 03.");
      return;
    }

    if (!form.workSchedule.start.trim() || !form.workSchedule.end.trim()) {
      setError("Start time and end time are required.");
      return;
    }

    if (!form.workSchedule.workingDays?.length) {
      setError("Select at least one working day.");
      return;
    }

    if (isEdit && (!form.employeeId.trim() || !form.devicePin.trim())) {
      setError("Employee ID and Device PIN are required when editing.");
      return;
    }

    if (form.devicePin.trim() && !/^[1-9][0-9]*$/.test(form.devicePin.trim())) {
      setError("Device PIN must be digits only with no leading zero (K50 rule).");
      return;
    }

    if (
      form.employeeId.trim() &&
      !/^[A-Za-z]{2,5}-[1-9][0-9]*$/.test(form.employeeId.trim())
    ) {
      setError("Employee ID must look like CITY-n (e.g. THT-1). No leading zeros.");
      return;
    }

    const needsPassword =
      isFieldRole &&
      (!isEdit || form.resetPassword || !employee?.hasFieldPassword);

    if (needsPassword) {
      if (!form.password.trim()) {
        setError("Field app password is required for Order Taker / Dispatcher.");
        return;
      }
      if (form.password.length < 6) {
        setError("Field app password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone,
      cnic: form.cnic.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
      documents: form.documents || [],
      branch: form.branch,
      designation: form.designation,
      department: form.department.trim(),
      role: form.role,
      status: form.status,
      image: form.image || "",
      joiningDate: form.joiningDate || undefined,
      basicSalary: Number(form.basicSalary) || 0,
      bankName: form.bankName.trim(),
      bankAccountTitle: form.bankAccountTitle.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      smdsPartyCode: form.smdsPartyCode.trim(),
      workSchedule: {
        start: form.workSchedule.start.trim(),
        end: form.workSchedule.end.trim(),
        lateThresholdMinutes: Number(form.workSchedule.lateThresholdMinutes) || 0,
        halfDayHours: Number(form.workSchedule.halfDayHours) || 0,
        fullDayHours: Number(form.workSchedule.fullDayHours) || 8,
        workingDays: form.workSchedule.workingDays,
      },
    };

    if (form.employeeId.trim()) {
      payload.employeeId = form.employeeId.trim().toUpperCase();
    }
    if (form.devicePin.trim()) {
      payload.devicePin = form.devicePin.trim();
    }
    if (needsPassword && form.password.trim()) {
      payload.password = form.password;
    }

    try {
      if (isEdit) {
        await employeeService.updateEmployee(employee._id, payload);
        notifySuccess("Employee updated successfully");
      } else {
        await employeeService.createEmployee(payload);
        notifySuccess("Employee added successfully");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to save employee. Please try again.";
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 transition-all duration-300 z-40 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[520px] bg-white shadow-2xl z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEdit
                ? "Update employee profile and work schedule."
                : "Create a new employee with their own timings."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto h-[calc(100vh-90px)]"
        >
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 overflow-hidden bg-slate-100">
              {form.image ? (
                <img
                  src={form.image}
                  alt="Employee"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={40} className="text-slate-400" />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleImage}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition px-5 py-2 rounded-xl text-sm font-medium"
            >
              <Upload size={16} />
              Upload Photo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 mt-8">
            <div className="col-span-2">
              <label className="block mb-2 text-sm font-medium">
                Full Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ahmed Raza"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Employee ID {isEdit ? "*" : "(optional)"}
              </label>
              <input
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="THT-1"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                City-based ID (e.g. THT-1). Leave blank on create to auto-generate
                from the branch city code.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                K50 / Device PIN {isEdit ? "*" : "(optional)"}
              </label>
              <input
                name="devicePin"
                value={form.devicePin}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="101"
                inputMode="numeric"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Digits only, no leading zero. Enroll this PIN on the biometric
                machine — not the Employee ID.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Phone Number *
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="03XXXXXXXXX"
                inputMode="numeric"
                maxLength={11}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Must be 11 digits and start with 03 (e.g. 03001234567).
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">CNIC</label>
              <input
                name="cnic"
                value={form.cnic}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-800">
                Payroll & SMDS
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Basic salary (monthly PKR)
                  </label>
                  <input
                    name="basicSalary"
                    value={form.basicSalary}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="50000"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    SMDS party code
                  </label>
                  <input
                    name="smdsPartyCode"
                    value={form.smdsPartyCode}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="8000001"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Field salesman code from SMDS (unique per branch). Used for
                    first-order attendance sync.
                  </p>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Bank name
                  </label>
                  <input
                    name="bankName"
                    value={form.bankName}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="HBL"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Account title
                  </label>
                  <input
                    name="bankAccountTitle"
                    value={form.bankAccountTitle}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-2 text-sm font-medium">
                    Account number
                  </label>
                  <input
                    name="bankAccountNumber"
                    value={form.bankAccountNumber}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Emergency contact name
              </label>
              <input
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Relative / guardian name"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Emergency contact phone
              </label>
              <input
                name="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="03XXXXXXXXX"
                inputMode="numeric"
                maxLength={11}
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Documents</p>
              <p className="text-xs text-slate-500">
                Add CNIC image, CV, or other files (image or PDF).
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer px-3 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50">
                  Add CNIC image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleDocument("cnic_image", e)}
                  />
                </label>
                <label className="cursor-pointer px-3 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50">
                  Add CV
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleDocument("cv", e)}
                  />
                </label>
                <label className="cursor-pointer px-3 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50">
                  Add other
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleDocument("other", e)}
                  />
                </label>
              </div>
              {(form.documents || []).length > 0 ? (
                <ul className="space-y-2">
                  {form.documents.map((doc, index) => (
                    <li
                      key={`${doc.type}-${doc.name}-${index}`}
                      className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {docLabel(doc.type)}
                          {doc.name ? ` · ${doc.name}` : ""}
                        </p>
                        {doc.url?.startsWith("http") ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Ready to upload
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 text-xs font-semibold shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Branch *</label>
              <select
                name="branch"
                value={form.branch}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Designation *
              </label>
              <select
                name="designation"
                value={form.designation}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">Select Designation</option>
                {employeeService.DESIGNATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Department
              </label>
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Sales"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Employee Type
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
              >
                {employeeService.EMPLOYEE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {isFieldRole && (
              <div className="sm:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Field app access
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Login ID is the Employee ID. Password is set only by you —
                    staff cannot change it themselves.
                    {isEdit && employee?.hasFieldPassword
                      ? " Password is already set."
                      : ""}
                  </p>
                </div>

                {isEdit && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.resetPassword}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          resetPassword: e.target.checked,
                          password: "",
                          confirmPassword: "",
                        }))
                      }
                    />
                    Reset password
                  </label>
                )}

                {(!isEdit || form.resetPassword || !employee?.hasFieldPassword) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        {isEdit ? "New password *" : "Set password *"}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full border rounded-xl px-4 py-3 bg-white"
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Confirm password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full border rounded-xl px-4 py-3 bg-white"
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium">
                Joining Date
              </label>
              <input
                type="date"
                name="joiningDate"
                value={form.joiningDate}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Work schedule *
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Used for late marking and attendance. Prefills from company
                defaults ({companyDefaults.start} – {companyDefaults.end}).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Start Time *
                </label>
                <input
                  name="start"
                  value={form.workSchedule.start}
                  onChange={handleScheduleChange}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="09:00 AM"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  End Time *
                </label>
                <input
                  name="end"
                  value={form.workSchedule.end}
                  onChange={handleScheduleChange}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="06:00 PM"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Late Threshold (min)
                </label>
                <input
                  type="number"
                  min={0}
                  name="lateThresholdMinutes"
                  value={form.workSchedule.lateThresholdMinutes}
                  onChange={handleScheduleChange}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Full Day Hours
                </label>
                <input
                  type="number"
                  min={1}
                  name="fullDayHours"
                  value={form.workSchedule.fullDayHours}
                  onChange={handleScheduleChange}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
              <div className="col-span-2">
                <label className="block mb-2 text-sm font-medium">
                  Half Day Hours
                </label>
                <input
                  type="number"
                  min={0}
                  name="halfDayHours"
                  value={form.workSchedule.halfDayHours}
                  onChange={handleScheduleChange}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Working Days *</p>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = form.workSchedule.workingDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleWorkingDay(day)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none text-white"
            >
              {saving
                ? "Saving employee…"
                : isEdit
                  ? "Update Employee"
                  : "Save Employee"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddEmployeeDrawer;
