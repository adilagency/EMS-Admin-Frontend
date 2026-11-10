import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Wallet,
  Plus,
  Trash2,
  Save,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import * as branchService from "../services/branchService";
import * as employeeService from "../services/employeeService";
import * as taClaimService from "../services/taClaimService";
import * as deductionService from "../services/deductionService";
import * as payrollService from "../services/payrollService";

const TABS = [
  { id: "salaries", label: "Salaries & DA" },
  { id: "ta", label: "Travel Allowance" },
  { id: "deductions", label: "Deductions" },
  { id: "run", label: "Run payroll" },
];

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const monthStart = () => `${today().slice(0, 8)}01`;

const money = (n) =>
  `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const PayrollPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "salaries";

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salaryDrafts, setSalaryDrafts] = useState({});
  const [savingId, setSavingId] = useState("");

  const [claims, setClaims] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [entryForm, setEntryForm] = useState({
    employee: "",
    date: today(),
    amount: "",
    note: "",
  });
  const [entrySaving, setEntrySaving] = useState(false);
  const [range, setRange] = useState({ from: monthStart(), to: today() });

  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [period, setPeriod] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [runBusy, setRunBusy] = useState(false);

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next);
  };

  const branchEmployees = useMemo(
    () =>
      employees.filter((e) => {
        const b =
          typeof e.branch === "object" ? e.branch?._id : e.branch;
        return String(b) === String(branchId);
      }),
    [employees, branchId]
  );

  const loadBranches = useCallback(async () => {
    const res = await branchService.getBranches();
    const list = res.data || [];
    setBranches(list);
    if (!branchId && list.length) {
      const tht = list.find((b) => b.cityCode === "THT");
      setBranchId(tht?._id || list[0]._id);
    }
  }, [branchId]);

  const loadEmployees = useCallback(async () => {
    if (!branchId) return;
    const res = await employeeService.getEmployees({
      branch: branchId,
      status: "Active",
    });
    const list = res.data || [];
    setEmployees(list);
    const drafts = {};
    list.forEach((e) => {
      drafts[e._id] = {
        basicSalary: e.basicSalary ?? 0,
        dailyAllowance: e.dailyAllowance ?? 0,
        bankName: e.bankName || "",
        bankAccountTitle: e.bankAccountTitle || "",
        bankAccountNumber: e.bankAccountNumber || "",
      };
    });
    setSalaryDrafts(drafts);
  }, [branchId]);

  const loadTa = useCallback(async () => {
    if (!branchId) return;
    const res = await taClaimService.getTaClaims({
      branch: branchId,
      from: range.from,
      to: range.to,
    });
    setClaims(res.data || []);
  }, [branchId, range.from, range.to]);

  const loadDeductions = useCallback(async () => {
    if (!branchId) return;
    const res = await deductionService.getDeductions({
      branch: branchId,
      from: range.from,
      to: range.to,
    });
    setDeductions(res.data || []);
  }, [branchId, range.from, range.to]);

  const loadPeriod = useCallback(async () => {
    if (!branchId) return;
    const res = await payrollService.getPeriods({ branch: branchId });
    const match = (res.data || []).find(
      (p) => p.year === Number(runYear) && p.month === Number(runMonth)
    );
    setPeriod(match || null);
    if (match) {
      const slips = await payrollService.getPayslips(match._id);
      setPayslips(slips.data || []);
    } else {
      setPayslips([]);
    }
  }, [branchId, runYear, runMonth]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBranches();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load branches");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBranches]);

  useEffect(() => {
    if (!branchId) return;
    loadEmployees().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load employees")
    );
  }, [branchId, loadEmployees]);

  useEffect(() => {
    if (!branchId || (tab !== "ta" && tab !== "deductions")) return;
    const loader = tab === "ta" ? loadTa : loadDeductions;
    loader().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load entries")
    );
  }, [branchId, tab, loadTa, loadDeductions]);

  useEffect(() => {
    if (!branchId || tab !== "run") return;
    loadPeriod().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load period")
    );
  }, [branchId, tab, loadPeriod]);

  const saveSalaryRow = async (empId) => {
    const draft = salaryDrafts[empId];
    if (!draft) return;
    setSavingId(empId);
    try {
      await employeeService.updateEmployee(empId, {
        basicSalary: Number(draft.basicSalary) || 0,
        dailyAllowance: Number(draft.dailyAllowance) || 0,
        bankName: draft.bankName,
        bankAccountTitle: draft.bankAccountTitle,
        bankAccountNumber: draft.bankAccountNumber,
      });
      toast.success("Saved");
      await loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSavingId("");
    }
  };

  const submitEntry = async (e, kind) => {
    e.preventDefault();
    if (!entryForm.employee || !entryForm.date || entryForm.amount === "") {
      toast.error("Employee, date and amount are required");
      return;
    }
    setEntrySaving(true);
    try {
      const payload = {
        employee: entryForm.employee,
        date: entryForm.date,
        amount: Number(entryForm.amount),
        note: entryForm.note,
      };
      if (kind === "ta") await taClaimService.createTaClaim(payload);
      else await deductionService.createDeduction(payload);
      toast.success(kind === "ta" ? "TA saved" : "Deduction saved");
      setEntryForm({ employee: "", date: today(), amount: "", note: "" });
      if (kind === "ta") await loadTa();
      else await loadDeductions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setEntrySaving(false);
    }
  };

  const deleteEntry = async (kind, id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      if (kind === "ta") await taClaimService.deleteTaClaim(id);
      else await deductionService.deleteDeduction(id);
      toast.success("Deleted");
      if (kind === "ta") await loadTa();
      else await loadDeductions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const openAndCalculate = async () => {
    if (!branchId) return;
    setRunBusy(true);
    try {
      let p = period;
      if (!p) {
        const created = await payrollService.createPeriod({
          branch: branchId,
          year: Number(runYear),
          month: Number(runMonth),
        });
        p = created.data;
        setPeriod(p);
      }
      const calc = await payrollService.calculatePeriod(p._id);
      setPeriod(calc.data.period);
      setPayslips(calc.data.payslips || []);
      toast.success(calc.message || "Calculated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Calculate failed");
    } finally {
      setRunBusy(false);
    }
  };

  const approve = async () => {
    if (!period?._id) return;
    setRunBusy(true);
    try {
      const res = await payrollService.approvePeriod(period._id);
      setPeriod(res.data);
      toast.success("Payroll approved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Approve failed");
    } finally {
      setRunBusy(false);
    }
  };

  const entryTotal = (rows) =>
    rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-blue-600 text-sm font-semibold uppercase">Payroll</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 flex items-center gap-2">
          <Wallet className="text-blue-600" size={28} />
          Payroll
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Select a branch, set salaries &amp; DA, log TA/deductions, then run the
          month.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5"
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.cityCode || b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!branchId ? (
        <p className="text-slate-500 text-center py-12">
          Select a branch to manage payroll.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                  tab === t.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "salaries" && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b text-sm text-slate-500">
                Basic salary is monthly. DA is a daily food rate (× present days
                at payroll). Save per row.
              </div>
              {branchEmployees.length === 0 ? (
                <p className="py-12 text-center text-slate-500">
                  No active employees in this branch.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-3">Employee</th>
                        <th className="px-3 py-3">Basic salary</th>
                        <th className="px-3 py-3">DA / day</th>
                        <th className="px-3 py-3">Bank</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {branchEmployees.map((emp) => {
                        const d = salaryDrafts[emp._id] || {};
                        return (
                          <tr key={emp._id} className="border-t">
                            <td className="px-3 py-3">
                              <div className="font-medium">{emp.employeeId}</div>
                              <div className="text-xs text-slate-500">
                                {emp.name}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                className="w-28 border rounded-lg px-2 py-1.5"
                                value={d.basicSalary ?? 0}
                                onChange={(e) =>
                                  setSalaryDrafts((prev) => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      basicSalary: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                className="w-24 border rounded-lg px-2 py-1.5"
                                value={d.dailyAllowance ?? 0}
                                onChange={(e) =>
                                  setSalaryDrafts((prev) => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      dailyAllowance: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-3 space-y-1 min-w-[180px]">
                              <input
                                className="w-full border rounded-lg px-2 py-1 text-xs"
                                placeholder="Bank name"
                                value={d.bankName || ""}
                                onChange={(e) =>
                                  setSalaryDrafts((prev) => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      bankName: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <input
                                className="w-full border rounded-lg px-2 py-1 text-xs"
                                placeholder="Account title"
                                value={d.bankAccountTitle || ""}
                                onChange={(e) =>
                                  setSalaryDrafts((prev) => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      bankAccountTitle: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <input
                                className="w-full border rounded-lg px-2 py-1 text-xs"
                                placeholder="Account number"
                                value={d.bankAccountNumber || ""}
                                onChange={(e) =>
                                  setSalaryDrafts((prev) => ({
                                    ...prev,
                                    [emp._id]: {
                                      ...prev[emp._id],
                                      bankAccountNumber: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                disabled={savingId === emp._id}
                                onClick={() => saveSalaryRow(emp._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-70"
                              >
                                <Save size={14} />
                                {savingId === emp._id ? "..." : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(tab === "ta" || tab === "deductions") && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => submitEntry(e, tab === "ta" ? "ta" : "ded")}
                className="bg-white rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Employee
                  </label>
                  <select
                    value={entryForm.employee}
                    onChange={(e) =>
                      setEntryForm((p) => ({ ...p, employee: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2.5"
                  >
                    <option value="">Select</option>
                    {branchEmployees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.employeeId} — {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={entryForm.date}
                    onChange={(e) =>
                      setEntryForm((p) => ({ ...p, date: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={entryForm.amount}
                    onChange={(e) =>
                      setEntryForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2.5"
                    placeholder="600"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={entrySaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
                  >
                    <Plus size={18} />
                    {entrySaving
                      ? "Saving..."
                      : tab === "ta"
                        ? "Add TA"
                        : "Add deduction"}
                  </button>
                </div>
                <div className="sm:col-span-2 lg:col-span-5">
                  <input
                    value={entryForm.note}
                    onChange={(e) =>
                      setEntryForm((p) => ({ ...p, note: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2.5"
                    placeholder="Note (optional)"
                  />
                </div>
              </form>

              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">From</label>
                  <input
                    type="date"
                    value={range.from}
                    onChange={(e) =>
                      setRange((p) => ({ ...p, from: e.target.value }))
                    }
                    className="border rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <input
                    type="date"
                    value={range.to}
                    onChange={(e) =>
                      setRange((p) => ({ ...p, to: e.target.value }))
                    }
                    className="border rounded-xl px-3 py-2.5"
                  />
                </div>
                <div className="text-sm font-medium text-slate-600 sm:ml-auto">
                  Total:{" "}
                  {money(
                    entryTotal(tab === "ta" ? claims : deductions)
                  )}
                </div>
              </div>

              <EntryTable
                rows={tab === "ta" ? claims : deductions}
                onDelete={(id) =>
                  deleteEntry(tab === "ta" ? "ta" : "ded", id)
                }
              />
            </div>
          )}

          {tab === "run" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <input
                    type="number"
                    min="2020"
                    value={runYear}
                    onChange={(e) => setRunYear(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 w-28"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <select
                    value={runMonth}
                    onChange={(e) => setRunMonth(Number(e.target.value))}
                    className="border rounded-xl px-3 py-2.5"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-slate-500">
                  Status:{" "}
                  <span className="font-semibold text-slate-800">
                    {period?.status || "Not opened"}
                  </span>
                  {period?.workingDaysInMonthSnapshot
                    ? ` · divisor ${period.workingDaysInMonthSnapshot}`
                    : ""}
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <button
                    type="button"
                    disabled={runBusy || period?.status === "Approved"}
                    onClick={openAndCalculate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Calculator size={18} />
                    {runBusy ? "Working..." : "Calculate"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      runBusy ||
                      !period ||
                      period.status !== "Calculated"
                    }
                    onClick={approve}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden">
                {payslips.length === 0 ? (
                  <p className="py-12 text-center text-slate-500">
                    No payslips yet. Click Calculate.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-3">Employee</th>
                          <th className="px-3 py-3">Days</th>
                          <th className="px-3 py-3">Salary</th>
                          <th className="px-3 py-3">TA</th>
                          <th className="px-3 py-3">DA</th>
                          <th className="px-3 py-3">Deductions</th>
                          <th className="px-3 py-3">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payslips.map((p) => (
                          <tr key={p._id} className="border-t">
                            <td className="px-3 py-3">
                              <div className="font-medium">
                                {p.employeeIdSnapshot ||
                                  p.employee?.employeeId}
                              </div>
                              <div className="text-xs text-slate-500">
                                {p.employeeNameSnapshot || p.employee?.name}
                              </div>
                            </td>
                            <td className="px-3 py-3">{p.payableDays}</td>
                            <td className="px-3 py-3">{money(p.salaryPart)}</td>
                            <td className="px-3 py-3">{money(p.taTotal)}</td>
                            <td className="px-3 py-3">
                              {money(p.daTotal)}
                              <div className="text-[10px] text-slate-400">
                                @{p.dailyAllowanceRate}/day
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {money(p.deductionTotal)}
                            </td>
                            <td className="px-3 py-3 font-semibold">
                              {money(p.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-slate-50 font-semibold">
                          <td className="px-3 py-3" colSpan={6}>
                            Branch total
                          </td>
                          <td className="px-3 py-3">
                            {money(
                              payslips.reduce(
                                (s, p) => s + (Number(p.net) || 0),
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const EntryTable = ({ rows, onDelete }) => {
  if (!rows.length) {
    return (
      <div className="bg-white rounded-2xl border py-12 text-center text-slate-500">
        No entries in this range.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {r.employee?.employeeId || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.employee?.name}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">
                  {money(r.amount)}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {r.note || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(r._id)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollPage;
