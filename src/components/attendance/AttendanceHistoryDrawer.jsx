import { useEffect, useState } from "react";
import { X, Fingerprint, Smartphone, Package, MapPinned } from "lucide-react";
import * as attendanceService from "../../services/attendanceService";

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

const AttendanceHistoryDrawer = ({ open, onClose, employee }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");

  const employeeId =
    typeof employee?.employee === "object"
      ? employee.employee?._id
      : employee?.employee;

  const employeeInfo =
    typeof employee?.employee === "object" ? employee.employee : null;

  useEffect(() => {
    if (!open || !employeeId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      setExpandedId("");

      try {
        const { data } = await attendanceService.getAttendanceHistory(employeeId);
        setRecords(data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load history.");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, employeeId]);

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
              Attendance History
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {employeeInfo?.name || "Employee"}{" "}
              {employeeInfo?.employeeId ? `· ${employeeInfo.employeeId}` : ""}
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

        <div className="p-6 overflow-y-auto h-[calc(100vh-90px)]">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : records.length === 0 ? (
            <p className="text-slate-500 text-center py-16">
              No attendance history found.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const isSmds = record.method === "SMDS";
                const openOrders = expandedId === record._id;
                const areas = uniqueOrderAreas(record.smdsOrders);

                return (
                  <div
                    key={record._id}
                    className="border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">
                        {record.date}
                      </p>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400">Check In</p>
                        <p className="font-medium">{record.checkIn || "--"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Method</p>
                        <div className="flex items-center gap-1.5 font-medium">
                          {record.method === "Biometric" && (
                            <Fingerprint size={14} className="text-blue-600" />
                          )}
                          {record.method === "GPS" && (
                            <Smartphone size={14} className="text-green-600" />
                          )}
                          {record.method === "SMDS" && (
                            <Package size={14} className="text-indigo-600" />
                          )}
                          {record.method || "--"}
                        </div>
                      </div>

                      {isSmds && record.smdsFirstOrderArea ? (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400">First order area</p>
                          <p className="font-medium flex items-center gap-1">
                            <MapPinned size={13} className="text-indigo-600" />
                            {record.smdsFirstOrderArea}
                          </p>
                        </div>
                      ) : null}

                      {isSmds && record.smdsRouteName ? (
                        <div>
                          <p className="text-xs text-slate-400">Route</p>
                          <p className="font-medium">{record.smdsRouteName}</p>
                        </div>
                      ) : null}

                      {isSmds && record.smdsOrderCount ? (
                        <div>
                          <p className="text-xs text-slate-400">Orders</p>
                          <p className="font-medium">{record.smdsOrderCount}</p>
                        </div>
                      ) : null}

                      {isSmds && areas.length ? (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400">Areas used</p>
                          <p className="font-medium text-sm">{areas.join(", ")}</p>
                        </div>
                      ) : null}

                      {record.note && !isSmds ? (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400">Note</p>
                          <p className="font-medium">{record.note}</p>
                        </div>
                      ) : null}
                    </div>

                    {isSmds && (record.smdsOrders || []).length > 0 ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(openOrders ? "" : record._id)
                          }
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {openOrders ? "Hide orders" : "Show orders"}
                        </button>
                        {openOrders ? (
                          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr className="text-left">
                                  <th className="px-2 py-1.5">Time</th>
                                  <th className="px-2 py-1.5">Order</th>
                                  <th className="px-2 py-1.5">Area</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(record.smdsOrders || []).map((o, idx) => (
                                  <tr
                                    key={`${o.orderNo || idx}-${o.orderDateTime || idx}`}
                                    className="border-t border-slate-100"
                                  >
                                    <td className="px-2 py-1 whitespace-nowrap">
                                      {formatOrderTime(o.orderDateTime)}
                                    </td>
                                    <td className="px-2 py-1">
                                      {o.orderNo || "—"}
                                    </td>
                                    <td className="px-2 py-1 font-medium">
                                      {o.area || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AttendanceHistoryDrawer;
