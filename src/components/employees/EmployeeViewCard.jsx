import { X } from "lucide-react";

const money = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  return `Rs ${Number(n).toLocaleString()}`;
};

const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-medium text-slate-800 break-words">
      {value || "—"}
    </p>
  </div>
);

const EmployeeViewCard = ({ open, employee, branchName, onClose, onEdit }) => {
  if (!open || !employee) return null;

  const avatar =
    employee.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      employee.name || "E"
    )}&background=2563eb&color=fff`;

  const schedule = employee.workSchedule || {};
  const shift =
    employee.shiftTiming ||
    (schedule.start && schedule.end
      ? `${schedule.start} – ${schedule.end}`
      : "—");
  const workingDays = (schedule.workingDays || []).join(", ") || "—";

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-4">
            <img
              src={avatar}
              alt={employee.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {employee.name}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    employee.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {employee.status || "—"}
                </span>
                {employee.hasFieldPassword && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                    Field app
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {employee.employeeId}
                {employee.role ? ` · ${employee.role}` : ""}
                {employee.designation ? ` · ${employee.designation}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Identity
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Device PIN" value={employee.devicePin} />
                <Field label="Phone" value={employee.phone} />
                <Field label="CNIC" value={employee.cnic} />
                <Field label="Branch" value={branchName} />
                <Field label="Department" value={employee.department} />
                <Field label="SMDS party" value={employee.smdsPartyCode} />
                <Field
                  label="Joining"
                  value={
                    employee.joiningDate
                      ? String(employee.joiningDate).slice(0, 10)
                      : ""
                  }
                />
                <Field
                  label="Emergency"
                  value={
                    employee.emergencyContactName ||
                    employee.emergencyContactPhone
                      ? [
                          employee.emergencyContactName,
                          employee.emergencyContactPhone,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : ""
                  }
                />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Schedule
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Shift" value={shift} />
                <Field
                  label="Late after"
                  value={
                    schedule.lateThresholdMinutes != null
                      ? `${schedule.lateThresholdMinutes} min`
                      : ""
                  }
                />
                <Field
                  label="Half / full day"
                  value={
                    schedule.halfDayHours != null ||
                    schedule.fullDayHours != null
                      ? `${schedule.halfDayHours ?? "—"}h / ${schedule.fullDayHours ?? "—"}h`
                      : ""
                  }
                />
                <Field label="Working days" value={workingDays} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Pay & bank
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Basic salary" value={money(employee.basicSalary)} />
                <Field
                  label="DA / day"
                  value={money(employee.dailyAllowance)}
                />
                <Field label="Bank" value={employee.bankName} />
                <Field
                  label="Account title"
                  value={employee.bankAccountTitle}
                />
                <Field
                  label="Account number"
                  value={employee.bankAccountNumber}
                />
              </div>
            </section>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
            >
              Close
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeViewCard;
