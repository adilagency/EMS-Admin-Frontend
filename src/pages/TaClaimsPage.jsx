import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import * as taClaimService from "../services/taClaimService";
import * as employeeService from "../services/employeeService";
import * as branchService from "../services/branchService";

const today = () => new Date().toISOString().slice(0, 10);

const TaClaimsPage = () => {
  const [claims, setClaims] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    branch: "all",
    from: today().slice(0, 8) + "01",
    to: today(),
  });
  const [form, setForm] = useState({
    employee: "",
    date: today(),
    amount: "",
    note: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.branch !== "all") params.branch = filters.branch;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const [claimsRes, empRes, branchRes] = await Promise.all([
        taClaimService.getTaClaims(params),
        employeeService.getEmployees({ status: "Active" }),
        branchService.getBranches(),
      ]);
      setClaims(claimsRes.data || []);
      setEmployees(empRes.data || []);
      setBranches(branchRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load TA claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.branch, filters.from, filters.to]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.date || form.amount === "") {
      toast.error("Employee, date and amount are required");
      return;
    }
    setSaving(true);
    try {
      await taClaimService.createTaClaim({
        employee: form.employee,
        date: form.date,
        amount: Number(form.amount),
        note: form.note,
      });
      toast.success("TA claim saved");
      setForm({ employee: "", date: today(), amount: "", note: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save TA");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this TA claim?")) return;
    try {
      await taClaimService.deleteTaClaim(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const total = claims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-blue-600 text-sm font-semibold uppercase">Payroll</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 flex items-center gap-2">
          <Wallet className="text-blue-600" size={28} />
          Travel Allowance (TA)
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Manual TA entries (e.g. bus ticket). Amounts are added to salary at
          payroll.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">Employee</label>
          <select
            value={form.employee}
            onChange={(e) =>
              setForm((p) => ({ ...p, employee: e.target.value }))
            }
            className="w-full border rounded-xl px-3 py-2.5"
          >
            <option value="">Select employee</option>
            {employees.map((emp) => (
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
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount (Rs)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="600"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
          >
            <Plus size={18} />
            {saving ? "Saving..." : "Add TA"}
          </button>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <label className="block text-sm font-medium mb-1">Note</label>
          <input
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="Bus ticket to Gharo / route note"
          />
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select
            value={filters.branch}
            onChange={(e) =>
              setFilters((p) => ({ ...p, branch: e.target.value }))
            }
            className="border rounded-xl px-3 py-2.5 min-w-[160px]"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.cityCode || b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters((p) => ({ ...p, from: e.target.value }))
            }
            className="border rounded-xl px-3 py-2.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            className="border rounded-xl px-3 py-2.5"
          />
        </div>
        <div className="sm:ml-auto text-sm text-slate-600 font-medium">
          Total in view: Rs {total.toLocaleString()}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : claims.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No TA claims yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c._id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">{c.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {c.employee?.employeeId || "—"}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {c.employee?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.branch?.cityCode || c.branch?.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      Rs {Number(c.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {c.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
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
};

export default TaClaimsPage;
