import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserCheck, UserX, Clock3, Plane, Radio } from "lucide-react";
import toast from "react-hot-toast";

import AttendanceStatsCard from "../components/attendance/AttendanceStatsCard";
import AttendanceFilters from "../components/attendance/AttendanceFilters";
import AttendanceTable from "../components/attendance/AttendanceTable";
import AttendanceHistoryDrawer from "../components/attendance/AttendanceHistoryDrawer";
import ManualAttendanceModal from "../components/attendance/ManualAttendanceModal";
import * as attendanceService from "../services/attendanceService";
import * as branchService from "../services/branchService";
import * as smdsService from "../services/smdsService";
import {
  attendanceFingerprint,
  playAttendanceChime,
  unlockAttendanceAudio,
} from "../utils/attendanceLive";

const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PAGE_SIZE = 10;
const LIVE_POLL_MS = 4000;

const AttendancePage = () => {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState(todayLocal());
  const [branches, setBranches] = useState([]);
  const [records, setRecords] = useState([]);
  const [statsData, setStatsData] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
  });
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const [error, setError] = useState("");
  const [historyRecord, setHistoryRecord] = useState(null);
  const [page, setPage] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [smdsSyncing, setSmdsSyncing] = useState(false);

  const fingerprintRef = useRef("");
  const readyRef = useRef(false);
  const filtersRef = useRef({ search, branch, method, status, date });
  const inFlightRef = useRef(false);

  filtersRef.current = { search, branch, method, status, date };

  const loadBranches = useCallback(async () => {
    try {
      const { data } = await branchService.getBranches();
      setBranches(data || []);
    } catch {
      setBranches([]);
    }
  }, []);

  const fetchAttendance = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current && silent) return;
    inFlightRef.current = true;

    if (!silent) {
      setLoading(true);
      setError("");
    }

    const { search: q, branch: b, method: m, status: s, date: d } =
      filtersRef.current;

    try {
      const params = {
        date: d,
        // bust any intermediary/browser GET cache
        _ts: Date.now(),
      };
      if (q.trim()) params.search = q.trim();
      if (b !== "all") params.branch = b;
      if (m !== "all") params.method = m;
      if (s !== "all") params.status = s;

      const [listRes, statsRes] = await Promise.all([
        attendanceService.getAttendance(params),
        attendanceService.getAttendanceStats({ date: d, _ts: Date.now() }),
      ]);

      const nextRecords = listRes.data || [];
      const nextFp = attendanceFingerprint(nextRecords);

      if (
        silent &&
        readyRef.current &&
        fingerprintRef.current &&
        nextFp !== fingerprintRef.current
      ) {
        playAttendanceChime();
        toast.success("New attendance update", { duration: 2500 });
      }

      fingerprintRef.current = nextFp;
      readyRef.current = true;
      setRecords(nextRecords);
      setStatsData(
        statsRes.data || { present: 0, absent: 0, late: 0, onLeave: 0 }
      );
      setLastLiveAt(new Date());
      if (silent) setPollCount((n) => n + 1);
      setError("");
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || "Failed to load attendance.");
        setRecords([]);
      }
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Reset fingerprint when filters change, then load
  useEffect(() => {
    readyRef.current = false;
    fingerprintRef.current = "";
    const timer = setTimeout(
      () => {
        fetchAttendance({ silent: false });
      },
      search ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [search, branch, method, status, date, fetchAttendance]);

  // Stable live polling (does not depend on fetchAttendance identity churn)
  useEffect(() => {
    if (!live) return undefined;

    const tick = () => {
      if (document.hidden) return;
      fetchAttendance({ silent: true });
    };

    // first silent poll shortly after mount so user sees "Updated" move
    const kickoff = setTimeout(tick, 1500);
    const id = setInterval(tick, LIVE_POLL_MS);

    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(kickoff);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, fetchAttendance]);

  useEffect(() => {
    setPage(1);
  }, [search, branch, method, status, date]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return records.slice(start, start + PAGE_SIZE);
  }, [records, page]);

  const toggleLive = () => {
    unlockAttendanceAudio();
    // Test chime when turning live on so user knows sound works
    if (!live) {
      playAttendanceChime();
      toast.success("Live updates on — sound unlocked", { duration: 2000 });
    }
    setLive((v) => !v);
  };

  const exportCsv = () => {
    if (!records.length) {
      toast.error("No records to export.");
      return;
    }

    const headers = [
      "Employee",
      "Employee ID",
      "Branch",
      "Check In",
      "Method",
      "Status",
      "Note",
      "Date",
    ];

    const rows = records.map((record) => {
      const emp = record.employee || {};
      const branchName = record.branch?.name || emp.branch?.name || "";
      return [
        emp.name || "",
        emp.employeeId || "",
        branchName,
        record.checkIn || "",
        record.method || "",
        record.status || "",
        record.note || "",
        record.date || date,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const stats = [
    {
      title: "Present Today",
      value: statsData.present,
      icon: UserCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      change: String(statsData.present),
      positive: true,
    },
    {
      title: "Absent Today",
      value: statsData.absent,
      icon: UserX,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      change: String(statsData.absent),
      positive: false,
    },
    {
      title: "Late Arrivals",
      value: statsData.late,
      icon: Clock3,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      change: String(statsData.late),
      positive: statsData.late === 0,
    },
    {
      title: "On Leave",
      value: statsData.onLeave,
      icon: Plane,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      change: String(statsData.onLeave),
      positive: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-blue-600 text-sm font-semibold uppercase">
            Attendance Management
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Attendance</h1>

          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Check-in only — biometric, manual, or SMDS first order of the day
            counts as attendance.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                live
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Radio size={12} className={live ? "animate-pulse" : ""} />
              {live ? "Live · every 4s" : "Live paused"}
            </span>
            {lastLiveAt && (
              <span>
                Updated {lastLiveAt.toLocaleTimeString()}
                {live ? ` · polls ${pollCount}` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={smdsSyncing}
            onClick={async () => {
              setSmdsSyncing(true);
              try {
                const res = await smdsService.syncSmdsAttendance({
                  date,
                  ...(branch !== "all" ? { branchId: branch } : {}),
                });
                const d = res.data || {};
                toast.success(
                  `SMDS sync: ${d.synced || 0} present, ${d.skipped || 0} skipped` +
                    (d.errors?.length ? `, ${d.errors.length} errors` : "")
                );
                fetchAttendance({ silent: false });
              } catch (err) {
                toast.error(
                  err.response?.data?.message || "SMDS sync failed"
                );
              } finally {
                setSmdsSyncing(false);
              }
            }}
            className="border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 transition px-5 py-3 rounded-xl font-medium w-full sm:w-auto disabled:opacity-70"
          >
            {smdsSyncing ? "Syncing SMDS..." : "Sync SMDS field"}
          </button>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 transition px-5 py-3 rounded-xl font-medium w-full sm:w-auto"
          >
            Manual attendance
          </button>
          <button
            type="button"
            onClick={toggleLive}
            className="border border-slate-200 hover:bg-slate-50 transition px-5 py-3 rounded-xl font-medium w-full sm:w-auto"
          >
            {live ? "Pause live" : "Resume live"}
          </button>
          <button
            type="button"
            onClick={() => {
              unlockAttendanceAudio();
              fetchAttendance({ silent: false });
            }}
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium w-full sm:w-auto"
          >
            Refresh now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((item) => (
          <AttendanceStatsCard key={item.title} {...item} />
        ))}
      </div>

      <AttendanceFilters
        search={search}
        branch={branch}
        method={method}
        status={status}
        date={date}
        branches={branches}
        onSearchChange={setSearch}
        onBranchChange={setBranch}
        onMethodChange={setMethod}
        onStatusChange={setStatus}
        onDateChange={setDate}
        onExport={exportCsv}
      />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <AttendanceTable
        records={pagedRecords}
        loading={loading}
        onViewHistory={setHistoryRecord}
        page={page}
        pageSize={PAGE_SIZE}
        total={records.length}
        onPageChange={setPage}
      />

      <AttendanceHistoryDrawer
        open={Boolean(historyRecord)}
        employee={historyRecord}
        onClose={() => setHistoryRecord(null)}
      />

      <ManualAttendanceModal
        open={manualOpen}
        defaultDate={date}
        onClose={() => setManualOpen(false)}
        onSaved={() => fetchAttendance({ silent: false })}
      />
    </div>
  );
};

export default AttendancePage;
