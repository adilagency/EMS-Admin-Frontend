import { Fragment, useState } from "react";
import {
  Eye,
  Fingerprint,
  Smartphone,
  Users,
  PenLine,
  Package,
  ChevronDown,
  ChevronUp,
  MapPinned,
} from "lucide-react";
import Pagination from "../Pagination";

const getStatusBadge = (status) => {
  switch (status) {
    case "Present":
      return "bg-green-100 text-green-700";
    case "Working":
      return "bg-blue-100 text-blue-700";
    case "Absent":
      return "bg-red-100 text-red-700";
    case "Late":
      return "bg-orange-100 text-orange-700";
    case "On Leave":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const uniqueOrderAreas = (orders = []) => {
  const seen = new Set();
  const list = [];
  for (const o of orders) {
    const name = String(o.area || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    list.push(name);
  }
  return list;
};

const formatOrderTime = (iso) => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const AttendanceTable = ({
  records = [],
  loading = false,
  onViewHistory,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
}) => {
  const [expandedId, setExpandedId] = useState("");

  const avatarSrc = (employee) =>
    employee?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(employee?.name || "E")}&background=2563eb&color=fff`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-5 border-b">
        <h2 className="text-lg sm:text-xl font-bold">Today&apos;s Attendance</h2>
        <p className="text-sm text-slate-500 mt-1">
          Check-in only — first mark of the day counts as attendance. SMDS rows
          also keep that day&apos;s orders and areas.
        </p>
      </div>

      <div className="table-scroll">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm">
              <th className="px-6 py-4">Employee</th>
              <th>Branch</th>
              <th>Check In</th>
              <th>Method</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-20">
                  <div className="flex justify-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : records.length > 0 ? (
              records.map((record) => {
                const employee = record.employee || {};
                const branchName =
                  record.branch?.name || employee.branch?.name || "—";
                const isSmds = record.method === "SMDS";
                const open = expandedId === record._id;
                const areas = uniqueOrderAreas(record.smdsOrders);
                const areaPreview = areas.slice(0, 3).join(", ");
                const moreAreas = areas.length > 3 ? ` +${areas.length - 3}` : "";

                return (
                  <Fragment key={record._id}>
                    <tr className="border-t hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarSrc(employee)}
                            alt={employee.name || "Employee"}
                            className="w-11 h-11 rounded-full object-cover"
                          />
                          <div>
                            <h4 className="font-semibold">
                              {employee.name || "Unknown"}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {employee.employeeId || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>{branchName}</td>
                      <td>{record.checkIn || "--"}</td>

                      <td>
                        {record.method === "Biometric" && (
                          <div className="flex items-center gap-2">
                            <Fingerprint size={16} className="text-blue-600" />
                            Biometric
                          </div>
                        )}
                        {record.method === "GPS" && (
                          <div className="flex items-center gap-2">
                            <Smartphone size={16} className="text-green-600" />
                            GPS
                          </div>
                        )}
                        {record.method === "Manual" && (
                          <div className="flex items-center gap-2">
                            <PenLine size={16} className="text-amber-600" />
                            Manual
                          </div>
                        )}
                        {record.method === "SMDS" && (
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-indigo-600" />
                            SMDS
                          </div>
                        )}
                        {(record.method === "--" || !record.method) && "--"}
                      </td>

                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                        {isSmds ? (
                          <div className="mt-1.5 space-y-0.5 max-w-[240px]">
                            {record.smdsFirstOrderArea ? (
                              <p className="text-xs text-slate-600">
                                First area:{" "}
                                <span className="font-medium">
                                  {record.smdsFirstOrderArea}
                                </span>
                              </p>
                            ) : null}
                            {record.smdsRouteName ? (
                              <p className="text-xs text-slate-500">
                                Route:{" "}
                                <span className="font-medium text-slate-700">
                                  {record.smdsRouteName}
                                </span>
                                {record.smdsOrderCount
                                  ? ` · ${record.smdsOrderCount} orders`
                                  : ""}
                              </p>
                            ) : record.smdsOrderCount ? (
                              <p className="text-xs text-slate-500">
                                {record.smdsOrderCount} orders
                              </p>
                            ) : null}
                            {areaPreview ? (
                              <p
                                className="text-[11px] text-slate-400 truncate"
                                title={areas.join(", ")}
                              >
                                Areas: {areaPreview}
                                {moreAreas}
                              </p>
                            ) : null}
                            {(record.smdsOrders || []).length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(open ? "" : record._id)
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 mt-0.5"
                              >
                                {open ? (
                                  <ChevronUp size={12} />
                                ) : (
                                  <ChevronDown size={12} />
                                )}
                                {open ? "Hide orders" : "Show orders"}
                              </button>
                            ) : null}
                          </div>
                        ) : record.note ? (
                          <p
                            className="text-xs text-slate-400 mt-1 max-w-[140px] truncate"
                            title={record.note}
                          >
                            {record.note}
                          </p>
                        ) : null}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => onViewHistory?.(record)}
                          className="w-9 h-9 rounded-xl border hover:bg-slate-100 inline-flex items-center justify-center"
                          title="View history"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b flex items-center gap-1.5">
                              <MapPinned size={13} className="text-indigo-600" />
                              Orders that day
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                  <tr className="text-left">
                                    <th className="px-3 py-2">Time</th>
                                    <th className="px-3 py-2">Order</th>
                                    <th className="px-3 py-2">Customer</th>
                                    <th className="px-3 py-2">Area</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(record.smdsOrders || []).map((o, idx) => (
                                    <tr
                                      key={`${o.orderNo || idx}-${o.orderDateTime || idx}`}
                                      className="border-t border-slate-100"
                                    >
                                      <td className="px-3 py-1.5 whitespace-nowrap">
                                        {formatOrderTime(o.orderDateTime)}
                                      </td>
                                      <td className="px-3 py-1.5">
                                        {o.orderNo || "—"}
                                      </td>
                                      <td className="px-3 py-1.5">
                                        {o.customerName || "—"}
                                      </td>
                                      <td className="px-3 py-1.5 font-medium">
                                        {o.area || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-20">
                  <div className="flex flex-col items-center text-slate-500">
                    <Users size={36} className="text-blue-600 mb-3" />
                    <p className="font-medium text-slate-800">
                      No attendance records
                    </p>
                    <p className="text-sm mt-1">
                      Try another date or adjust your filters.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default AttendanceTable;
