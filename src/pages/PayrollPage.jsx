import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Wallet,
  Plus,
  Trash2,
  Save,
  Calculator,
  CheckCircle2,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import * as branchService from "../services/branchService";
import * as employeeService from "../services/employeeService";
import * as taClaimService from "../services/taClaimService";
import * as deductionService from "../services/deductionService";
import * as payrollService from "../services/payrollService";

const TABS = [
  { id: "employees", label: "Employees pay" },
  { id: "deductions", label: "Deductions" },
  { id: "run", label: "Run payroll" },
];

const normalizeTab = (raw) => {
  if (raw === "ta" || raw === "salaries") return "employees";
  if (TABS.some((t) => t.id === raw)) return raw;
  return "employees";
};

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
  const tab = normalizeTab(searchParams.get("tab"));

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salaryDrafts, setSalaryDrafts] = useState({});
  const [taDrafts, setTaDrafts] = useState({});
  const [savingId, setSavingId] = useState("");
  const [taSavingId, setTaSavingId] = useState("");

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

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw && normalizeTab(raw) !== raw) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", normalizeTab(raw));
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const branchEmployees = useMemo(
    () =>
      employees.filter((e) => {
        const b = typeof e.branch === "object" ? e.branch?._id : e.branch;
        return String(b) === String(branchId);
      }),
    [employees, branchId]
  );

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    // Don't dump the whole branch roster — only show matches after search
    if (!q) return [];
    return branchEmployees.filter((e) => {
      const hay = [
        e.name,
        e.employeeId,
        e.designation,
        e.role,
        e.department,
        e.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [branchEmployees, employeeSearch]);

  const selectedBranch = useMemo(
    () => branches.find((b) => String(b._id) === String(branchId)),
    [branches, branchId]
  );

  const claimsByEmployee = useMemo(() => {
    const map = new Map();
    for (const c of claims) {
      const id =
        typeof c.employee === "object" ? c.employee?._id : c.employee;
      if (!id) continue;
      const key = String(id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return map;
  }, [claims]);

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
    const taNext = {};
    list.forEach((e) => {
      drafts[e._id] = {
        basicSalary: e.basicSalary ?? 0,
        dailyAllowance: e.dailyAllowance ?? 0,
      };
      taNext[e._id] = { amount: "", note: "", date: today() };
    });
    setSalaryDrafts(drafts);
    setTaDrafts((prev) => {
      const merged = { ...taNext };
      for (const id of Object.keys(merged)) {
        if (prev[id]) merged[id] = { ...merged[id], ...prev[id] };
      }
      return merged;
    });
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
    if (match?._id) {
      const slips = await payrollService.getPayslips(match._id);
      setPayslips(slips.data || []);
    } else {
      setPayslips([]);
    }
  }, [branchId, runYear, runMonth]);

  useEffect(() => {
    setLoading(true);
    loadBranches()
      .catch((err) =>
        toast.error(err.response?.data?.message || "Failed to load branches")
      )
      .finally(() => setLoading(false));
  }, [loadBranches]);

  useEffect(() => {
    if (!branchId) return;
    loadEmployees().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load employees")
    );
  }, [branchId, loadEmployees]);

  useEffect(() => {
    if (!branchId || tab !== "employees") return;
    loadTa().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load TA")
    );
  }, [branchId, tab, loadTa]);

  useEffect(() => {
    if (!branchId || tab !== "deductions") return;
    loadDeductions().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load deductions")
    );
  }, [branchId, tab, loadDeductions]);

  useEffect(() => {
    if (!branchId || tab !== "run") return;
    loadPeriod().catch((err) =>
      toast.error(err.response?.data?.message || "Failed to load period")
    );
  }, [branchId, tab, loadPeriod]);

  const updateDraft = (empId, patch) => {
    setSalaryDrafts((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], ...patch },
    }));
  };

  const updateTaDraft = (empId, patch) => {
    setTaDrafts((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], ...patch },
    }));
  };

  const saveSalaryRow = async (empId) => {
    const draft = salaryDrafts[empId];
    if (!draft) return;
    setSavingId(empId);
    try {
      await employeeService.updateEmployee(empId, {
        basicSalary: Number(draft.basicSalary) || 0,
        dailyAllowance: Number(draft.dailyAllowance) || 0,
      });
      toast.success("Pay rates saved");
      await loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSavingId("");
    }
  };

  const addTaForEmployee = async (empId) => {
    const draft = taDrafts[empId] || {};
    if (draft.amount === "" || draft.amount == null) {
      toast.error("Enter a TA amount");
      return;
    }
    setTaSavingId(empId);
    try {
      await taClaimService.createTaClaim({
        employee: empId,
        date: draft.date || today(),
        amount: Number(draft.amount),
        note: draft.note || "",
      });
      toast.success("TA added");
      updateTaDraft(empId, { amount: "", note: "" });
      await loadTa();
    } catch (err) {
      toast.error(err.response?.data?.message || "TA save failed");
    } finally {
      setTaSavingId("");
    }
  };

  const submitDeduction = async (e) => {
    e.preventDefault();
    if (!entryForm.employee || !entryForm.date || entryForm.amount === "") {
      toast.error("Employee, date and amount are required");
      return;
    }
    setEntrySaving(true);
    try {
      await deductionService.createDeduction({
        employee: entryForm.employee,
        date: entryForm.date,
        amount: Number(entryForm.amount),
        note: entryForm.note,
      });
      toast.success("Deduction saved");
      setEntryForm({ employee: "", date: today(), amount: "", note: "" });
      await loadDeductions();
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
          Set each employee&apos;s salary, DA, and TA in one place, then run the
          month.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setEmployeeSearch("");
              }}
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
          <div>
            <label className="block text-sm font-medium mb-1">
              Search employee
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                disabled={!branchId}
                placeholder={
                  branchId
                    ? "Name, ID, designation…"
                    : "Select a branch first"
                }
                className="w-full border rounded-xl pl-9 pr-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>
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

          {tab === "employees" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    TA range from
                  </label>
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
                <div className="sm:ml-auto text-sm text-slate-500">
                  {selectedBranch ? (
                    <span>
                      {selectedBranch.cityCode || selectedBranch.code}
                      {employeeSearch.trim()
                        ? ` — ${filteredEmployees.length} of ${branchEmployees.length} match`
                        : ` — ${branchEmployees.length} employees · search to configure`}
                    </span>
                  ) : null}
                  <p className="mt-1 max-w-md">
                    Search an employee above, then set salary, DA, and TA.
                  </p>
                </div>
              </div>

              {branchEmployees.length === 0 ? (
                <div className="bg-white rounded-2xl border py-12 text-center text-slate-500">
                  No active employees in this branch.
                </div>
              ) : !employeeSearch.trim() ? (
                <div className="bg-white rounded-2xl border py-14 text-center text-slate-500">
                  <Search size={28} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-slate-700">
                    Search to open an employee
                  </p>
                  <p className="text-sm mt-1">
                    Type a name or ID (e.g. Zulfiqar or THT-2) to set pay rates
                    and TA.
                  </p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="bg-white rounded-2xl border py-12 text-center text-slate-500">
                  No employees match “{employeeSearch.trim()}”.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEmployees.map((emp) => {
                    const d = salaryDrafts[emp._id] || {};
                    const ta = taDrafts[emp._id] || {
                      amount: "",
                      note: "",
                      date: today(),
                    };
                    const empClaims = claimsByEmployee.get(String(emp._id)) || [];
                    const taTotal = entryTotal(empClaims);

                    return (
                      <div
                        key={emp._id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{emp.employeeId}</div>
                            <div className="text-sm text-slate-500">
                              {emp.name}
                            </div>
                          </div>
                          <div className="text-sm text-slate-600">
                            Period TA:{" "}
                            <span className="font-semibold text-slate-900">
                              {money(taTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Basic salary
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="w-full border rounded-lg px-3 py-2"
                              value={d.basicSalary ?? 0}
                              onChange={(e) =>
                                updateDraft(emp._id, {
                                  basicSalary: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              DA / day
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="w-full border rounded-lg px-3 py-2"
                              value={d.dailyAllowance ?? 0}
                              onChange={(e) =>
                                updateDraft(emp._id, {
                                  dailyAllowance: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              disabled={savingId === emp._id}
                              onClick={() => saveSalaryRow(emp._id)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70"
                            >
                              <Save size={14} />
                              {savingId === emp._id ? "..." : "Save rates"}
                            </button>
                          </div>
                        </div>

                        <div className="px-4 pb-4 border-t pt-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Add travel allowance
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                            <div className="lg:col-span-2">
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2"
                                value={ta.date || today()}
                                onChange={(e) =>
                                  updateTaDraft(emp._id, {
                                    date: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Amount
                              </label>
                              <input
                                type="number"
                                min="0"
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="600"
                                value={ta.amount}
                                onChange={(e) =>
                                  updateTaDraft(emp._id, {
                                    amount: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="lg:col-span-6">
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Note
                              </label>
                              <input
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Route / reason (optional)"
                                value={ta.note || ""}
                                onChange={(e) =>
                                  updateTaDraft(emp._id, {
                                    note: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <button
                                type="button"
                                disabled={taSavingId === emp._id}
                                onClick={() => addTaForEmployee(emp._id)}
                                className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-70"
                              >
                                <Plus size={14} />
                                {taSavingId === emp._id ? "..." : "Add TA"}
                              </button>
                            </div>
                          </div>

                          {empClaims.length > 0 && (
                            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-left text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Amount</th>
                                    <th className="px-3 py-2">Note</th>
                                    <th className="px-3 py-2" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {empClaims.map((c) => (
                                    <tr key={c._id} className="border-t">
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {c.date}
                                      </td>
                                      <td className="px-3 py-2 font-semibold">
                                        {money(c.amount)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600 max-w-xs truncate">
                                        {c.note || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteEntry("ta", c._id)
                                          }
                                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "deductions" && (
            <div className="space-y-4">
              <form
                onSubmit={submitDeduction}
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
                    {entrySaving ? "Saving..." : "Add deduction"}
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
                  Total: {money(entryTotal(deductions))}
                </div>
              </div>

              <EntryTable
                rows={deductions}
                onDelete={(id) => deleteEntry("ded", id)}
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
                <div className="text-sm text-slate-600 sm:pb-2">
                  Status:{" "}
                  <span className="font-semibold">
                    {period?.status || "Not opened"}
                  </span>
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={openAndCalculate}
                    disabled={runBusy || period?.status === "Approved"}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
                  >
                    <Calculator size={18} />
                    {runBusy ? "Working..." : "Calculate"}
                  </button>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={
                      runBusy ||
                      !period ||
                      period.status !== "Calculated"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-70"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-4 py-3 border-b text-sm text-slate-500">
                  Payslips for selected month
                </div>
                {payslips.length === 0 ? (
                  <p className="py-12 text-center text-slate-500">
                    No payslips yet — click Calculate.
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
                            <td className="px-3 py-3">
                              {money(p.salaryPart)}
                            </td>
                            <td className="px-3 py-3">{money(p.taTotal)}</td>
                            <td className="px-3 py-3">
                              {money(p.daTotal)}
                              <div className="text-[11px] text-slate-400">
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
                          <td className="px-3 py-3" colSpan={2}>
                            Branch total
                          </td>
                          <td className="px-3 py-3">
                            {money(
                              payslips.reduce(
                                (s, p) => s + (Number(p.salaryPart) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {money(
                              payslips.reduce(
                                (s, p) => s + (Number(p.taTotal) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {money(
                              payslips.reduce(
                                (s, p) => s + (Number(p.daTotal) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {money(
                              payslips.reduce(
                                (s, p) => s + (Number(p.deductionTotal) || 0),
                                0
                              )
                            )}
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
                <td className="px-4 py-3 font-semibold">{money(r.amount)}</td>
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
