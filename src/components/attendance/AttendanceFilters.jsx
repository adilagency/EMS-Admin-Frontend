import { Search, CalendarDays, Download } from "lucide-react";

const AttendanceFilters = ({
  search,
  branch,
  method,
  status,
  date,
  branches = [],
  onSearchChange,
  onBranchChange,
  onMethodChange,
  onStatusChange,
  onDateChange,
  onExport,
}) => {
  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-center">
        <div className="relative sm:col-span-2">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search employee..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={branch}
          onChange={(e) => onBranchChange?.(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Branches</option>
          {branches.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={method}
          onChange={(e) => onMethodChange?.(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Methods</option>
          <option value="Biometric">Biometric</option>
          <option value="SMDS">SMDS (field order)</option>
          <option value="GPS">GPS</option>
          <option value="Manual">Manual</option>
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange?.(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="Present">Present</option>
          <option value="Working">Working</option>
          <option value="Absent">Absent</option>
          <option value="Late">Late</option>
          <option value="On Leave">On Leave</option>
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onDateChange?.(new Date().toISOString().slice(0, 10))
            }
            className={`flex items-center justify-center gap-2 flex-1 rounded-xl border border-slate-200 py-3 hover:bg-slate-50 ${
              isToday ? "bg-blue-50 border-blue-200 text-blue-700" : ""
            }`}
          >
            <CalendarDays size={18} />
            Today
          </button>

          <button
            type="button"
            onClick={onExport}
            className="w-12 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
            title="Export CSV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default AttendanceFilters;
