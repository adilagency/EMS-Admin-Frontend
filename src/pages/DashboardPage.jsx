import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Clock3,
  TriangleAlert,
  Building2,
  Moon,
  Sun,
} from "lucide-react";

import StatsCard from "../components/StatsCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import * as dashboardService from "../services/dashboardService";
import * as attendanceService from "../services/attendanceService";
import * as branchService from "../services/branchService";
import * as alertService from "../services/alertService";

const DashboardPage = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [attendancePreview, setAttendancePreview] = useState([]);
  const [branches, setBranches] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [error, setError] = useState("");

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const today = new Date().toISOString().slice(0, 10);

        const [dashRes, attRes, branchRes, alertRes] = await Promise.all([
          dashboardService.getDashboardStats(),
          attendanceService.getAttendance({ date: today }),
          branchService.getBranches(),
          alertService
            .getAlerts({ sync: "true", isRead: "false" })
            .catch(() => ({ data: [] })),
        ]);

        setStatsData(dashRes.data || {});
        setAttendancePreview((attRes.data || []).slice(0, 6));
        setBranches((branchRes.data || []).slice(0, 5));
        setCriticalAlerts(
          (alertRes.data || [])
            .filter((a) => a.severity === "critical" || !a.isRead)
            .slice(0, 6)
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = [
    {
      title: "Total Employees",
      value: statsData?.totalEmployees ?? 0,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      change: String(statsData?.totalEmployees ?? 0),
      changeText: "total",
      positive: true,
    },
    {
      title: "Present Today",
      value: statsData?.presentToday ?? 0,
      icon: UserCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      change: String(statsData?.presentToday ?? 0),
      changeText: "checked in",
      positive: true,
    },
    {
      title: "Absent Today",
      value: statsData?.absentToday ?? 0,
      icon: UserX,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      change: String(statsData?.absentToday ?? 0),
      changeText: "absent",
      positive: false,
    },
    {
      title: "Late Arrivals",
      value: statsData?.lateToday ?? 0,
      icon: Clock3,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      change: String(statsData?.lateToday ?? 0),
      changeText: "late",
      positive: (statsData?.lateToday ?? 0) === 0,
    },
    {
      title: "Active Alerts",
      value: statsData?.activeAlerts ?? 0,
      icon: TriangleAlert,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      change: String(statsData?.activeAlerts ?? 0),
      changeText: "needs action",
      positive: (statsData?.activeAlerts ?? 0) === 0,
    },
  ];

  const statusBadge = (status) => {
    if (status === "Present" || status === "Working")
      return "bg-green-100 text-green-700";
    if (status === "Absent") return "bg-red-100 text-red-700";
    if (status === "Late") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-blue-600 font-semibold text-sm uppercase">
            Overview
          </p>

          <h1 className="text-2xl sm:text-[30px] font-semibold text-slate-900 mt-1">
            {greeting}, {firstName}
          </h1>

          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Here's what's happening across all branches today.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium hover:bg-slate-50 transition"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium hover:bg-slate-50 transition"
          >
            Export Report
          </button>

          <button
            type="button"
            onClick={() => navigate("/employees")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            + Add Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border py-24 flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {stats.map((item) => (
              <StatsCard key={item.title} {...item} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl h-80 p-5 border shadow-sm flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Attendance Overview</h2>
                <button
                  type="button"
                  onClick={() => navigate("/attendance")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-3">
                {attendancePreview.length === 0 ? (
                  <p className="text-slate-500 text-sm py-10 text-center">
                    No attendance records for today.
                  </p>
                ) : (
                  attendancePreview.map((record) => (
                    <div
                      key={record._id}
                      className="flex items-center justify-between border-b border-slate-100 pb-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {record.employee?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.checkIn || "--"} ·{" "}
                          {record.branch?.name ||
                            record.employee?.branch?.name ||
                            "—"}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl h-80 p-5 border shadow-sm flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Branch Performance</h2>
                <button
                  type="button"
                  onClick={() => navigate("/branches")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-3">
                {branches.length === 0 ? (
                  <p className="text-slate-500 text-sm py-10 text-center">
                    No branches yet.
                  </p>
                ) : (
                  branches.map((branch) => (
                    <div
                      key={branch._id}
                      className="flex items-center justify-between border-b border-slate-100 pb-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Building2 size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{branch.name}</p>
                          <p className="text-xs text-slate-500">
                            {branch.city || "—"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {branch.employees ?? 0} staff
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl h-80 p-5 border shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Critical Alerts</h2>
              <button
                type="button"
                onClick={() => navigate("/alerts")}
                className="text-sm text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3">
              {criticalAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                    <TriangleAlert size={28} className="text-green-600" />
                  </div>
                  <p className="font-semibold text-slate-800">No active alerts</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Attendance looks clear.
                  </p>
                </div>
              ) : (
                criticalAlerts.map((alert) => (
                  <button
                    type="button"
                    key={alert._id}
                    onClick={() => navigate("/alerts")}
                    className="w-full text-left flex items-start justify-between border-b border-slate-100 pb-3 hover:bg-slate-50 rounded-lg px-1"
                  >
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {alert.message}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        alert.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : alert.severity === "warning"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
