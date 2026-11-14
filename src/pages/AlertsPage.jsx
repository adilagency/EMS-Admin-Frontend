import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  TriangleAlert,
  CheckCheck,
  Eye,
  MapPinned,
  UserX,
  Clock3,
  WifiOff,
  BatteryLow,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "../components/Pagination";
import * as alertService from "../services/alertService";
import * as branchService from "../services/branchService";

const PAGE_SIZE = 10;

const typeMeta = {
  absent: { label: "Absent", icon: UserX, color: "text-red-600 bg-red-50" },
  late: { label: "Late", icon: Clock3, color: "text-orange-600 bg-orange-50" },
  gps_disabled: {
    label: "GPS Disabled",
    icon: MapPinned,
    color: "text-red-600 bg-red-50",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    color: "text-slate-600 bg-slate-100",
  },
  low_battery: {
    label: "Low Battery",
    icon: BatteryLow,
    color: "text-amber-600 bg-amber-50",
  },
};

const severityBadge = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-orange-100 text-orange-700",
  info: "bg-blue-100 text-blue-700",
};

const AlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [branch, setBranch] = useState("all");
  const [isRead, setIsRead] = useState("all");
  const [page, setPage] = useState(1);

  const loadBranches = useCallback(async () => {
    try {
      const { data } = await branchService.getBranches();
      setBranches(data || []);
    } catch {
      setBranches([]);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { sync: "true" };
      if (type !== "all") params.type = type;
      if (severity !== "all") params.severity = severity;
      if (branch !== "all") params.branch = branch;
      if (isRead === "unread") params.isRead = "false";
      if (isRead === "read") params.isRead = "true";

      const { data } = await alertService.getAlerts(params);
      setAlerts(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load alerts.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [type, severity, branch, isRead]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    setPage(1);
  }, [type, severity, branch, isRead]);

  const pagedAlerts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return alerts.slice(start, start + PAGE_SIZE);
  }, [alerts, page]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await alertService.syncAlerts();
      await loadAlerts();
      toast.success("Alerts refreshed from live data");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync alerts.");
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkRead = async (alert) => {
    try {
      await alertService.markAlertRead(alert._id);
      setAlerts((prev) =>
        prev.map((item) =>
          item._id === alert._id ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllRead();
      setAlerts((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success("All alerts marked as read");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update alerts.");
    }
  };

  const handleDismiss = async (alert) => {
    try {
      await alertService.dismissAlert(alert._id);
      setAlerts((prev) => prev.filter((item) => item._id !== alert._id));
      toast.success("Alert dismissed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dismiss alert.");
    }
  };

  const openRelated = () => {
    navigate("/attendance");
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-blue-600 text-sm font-semibold uppercase">
            Alerts & Notifications
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Alerts</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Review attendance and system alerts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sync Alerts
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="all">All Types</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="gps_disabled">GPS Disabled</option>
            <option value="offline">Offline</option>
            <option value="low_battery">Low Battery</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="all">All Branches</option>
            {branches.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={isRead}
            onChange={(e) => setIsRead(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Bell size={16} />
        {unreadCount} unread · {alerts.length} total shown
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <TriangleAlert size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">No alerts</h2>
            <p className="text-slate-500 mt-2">
              Everything looks fine based on today’s data.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {pagedAlerts.map((alert) => {
              const meta = typeMeta[alert.type] || typeMeta.offline;
              const Icon = meta.icon;

              return (
                <div
                  key={alert._id}
                  className={`px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4 ${
                    alert.isRead ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">
                        {alert.title}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          severityBadge[alert.severity] || severityBadge.info
                        }`}
                      >
                        {alert.severity}
                      </span>
                      {!alert.isRead && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mt-1">{alert.message}</p>

                    <p className="text-xs text-slate-400 mt-2">
                      {alert.employee?.name || "Employee"} ·{" "}
                      {alert.branch?.name || "Branch n/a"} ·{" "}
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openRelated(alert)}
                      className="px-3 py-2 rounded-xl border text-sm hover:bg-slate-50"
                    >
                      Open
                    </button>

                    {!alert.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(alert)}
                        className="w-9 h-9 rounded-xl border hover:bg-slate-50 inline-flex items-center justify-center"
                        title="Mark as read"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDismiss(alert)}
                      className="px-3 py-2 rounded-xl border text-sm text-red-600 hover:bg-red-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={alerts.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default AlertsPage;
