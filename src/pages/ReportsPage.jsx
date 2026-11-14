import { useCallback, useEffect, useState } from "react";
import {
  FileBarChart,
  Download,
  CalendarDays,
  Users,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import * as reportService from "../services/reportService";
import * as branchService from "../services/branchService";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const reportTypes = [
  { id: "summary", label: "Summary", icon: FileBarChart },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "branches", label: "Branches", icon: Building2 },
];

const downloadCsv = (filename, headers, rows) => {
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const ReportsPage = () => {
  const [reportType, setReportType] = useState("summary");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);

  useEffect(() => {
    branchService
      .getBranches()
      .then((res) => setBranches(res.data || []))
      .catch(() => setBranches([]));
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { from, to, branch, status };

      if (reportType === "summary") {
        const res = await reportService.getSummary({ from, to });
        setSummary(res.data || null);
        setRows([]);
        setReportSummary(null);
      } else if (reportType === "attendance") {
        const res = await reportService.getAttendanceReport(params);
        setRows(res.data || []);
        setReportSummary(res.summary || null);
        setSummary(null);
      } else if (reportType === "branches") {
        const res = await reportService.getBranchReport({ from, to });
        setRows(res.data || []);
        setReportSummary(null);
        setSummary(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report.");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, from, to, branch, status]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = () => {
    if (reportType === "summary") {
      if (!summary) return toast.error("Nothing to export.");
      downloadCsv(
        `summary-${from}-to-${to}.csv`,
        ["Metric", "Value"],
        Object.entries(summary)
      );
      toast.success("CSV exported");
      return;
    }

    if (!rows.length) return toast.error("No rows to export.");

    if (reportType === "attendance") {
      downloadCsv(
        `attendance-${from}-to-${to}.csv`,
        [
          "Date",
          "Employee",
          "Employee ID",
          "Branch",
          "Check In",
          "Check Out",
          "Hours",
          "Method",
          "Status",
        ],
        rows.map((r) => [
          r.date,
          r.employee?.name,
          r.employee?.employeeId,
          r.branch?.name,
          r.checkIn,
          r.checkOut,
          r.hours,
          r.method,
          r.status,
        ])
      );
    } else if (reportType === "branches") {
      downloadCsv(
        `branches-${from}-to-${to}.csv`,
        ["Branch", "City", "Present", "Absent", "Late", "Total"],
        rows.map((r) => [
          r.name,
          r.city,
          r.present,
          r.absent,
          r.late,
          r.totalRecords,
        ])
      );
    }

    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-blue-600 text-sm font-semibold uppercase">
            Analytics
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Reports</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Generate attendance and branch reports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {reportTypes.map((item) => {
            const Icon = item.icon;
            const active = reportType === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setReportType(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={reportType === "summary" || reportType === "branches"}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 disabled:bg-slate-50"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={reportType !== "attendance"}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 disabled:bg-slate-50"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Working">Working</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {reportType === "summary" && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Employees", summary.totalEmployees, Users],
            ["Branches", summary.totalBranches, Building2],
            ["Present", summary.present, CalendarDays],
            ["Absent", summary.absent, CalendarDays],
            ["Late", summary.late, CalendarDays],
            ["Attendance Rows", summary.attendanceRecords, FileBarChart],
          ].map(([label, value, Icon]) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Icon size={16} />
                {label}
              </div>
              <p className="text-3xl font-bold mt-3">{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {reportSummary && reportType !== "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(reportSummary).map(([key, value]) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {key}
              </p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reportType === "summary" ? (
          <div className="p-8 text-slate-500 text-sm">
            Summary cards above cover {from} to {to}. Use Export CSV to download
            the metrics.
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No report data for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto table-scroll">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 border-b">
                {reportType === "attendance" && (
                  <tr className="text-left">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">In</th>
                    <th className="px-5 py-3">Out</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                )}
                {reportType === "branches" && (
                  <tr className="text-left">
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">City</th>
                    <th className="px-5 py-3">Present</th>
                    <th className="px-5 py-3">Absent</th>
                    <th className="px-5 py-3">Late</th>
                    <th className="px-5 py-3">Total</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {reportType === "attendance" &&
                  rows.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="px-5 py-3">{r.date}</td>
                      <td className="px-5 py-3">{r.employee?.name}</td>
                      <td className="px-5 py-3">{r.branch?.name}</td>
                      <td className="px-5 py-3">{r.checkIn}</td>
                      <td className="px-5 py-3">{r.checkOut}</td>
                      <td className="px-5 py-3">{r.status}</td>
                    </tr>
                  ))}
                {reportType === "branches" &&
                  rows.map((r) => (
                    <tr key={r.branchId} className="border-t">
                      <td className="px-5 py-3">{r.name}</td>
                      <td className="px-5 py-3">{r.city}</td>
                      <td className="px-5 py-3">{r.present}</td>
                      <td className="px-5 py-3">{r.absent}</td>
                      <td className="px-5 py-3">{r.late}</td>
                      <td className="px-5 py-3">{r.totalRecords}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
