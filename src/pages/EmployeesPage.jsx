import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Users, Eye, Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AddEmployeeDrawer from "../components/employees/AddEmployeeDrawer";
import EmployeeViewCard from "../components/employees/EmployeeViewCard";
import Pagination from "../components/Pagination";
import * as employeeService from "../services/employeeService";
import * as branchService from "../services/branchService";
import { notifyError, notifySuccess } from "../utils/notify";

const PAGE_SIZE = 10;

const EmployeesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDrawer, setOpenDrawer] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [branchFilter, setBranchFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const designations = useMemo(() => {
    const fromData = [
      ...new Set(employees.map((e) => e.designation).filter(Boolean)),
    ];
    return [...new Set([...employeeService.DESIGNATIONS, ...fromData])].sort();
  }, [employees]);

  const loadBranches = useCallback(async () => {
    try {
      const { data } = await branchService.getBranches();
      setBranches(data || []);
    } catch {
      setBranches([]);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (branchFilter !== "all") params.branch = branchFilter;
      if (designationFilter !== "all") params.designation = designationFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const { data } = await employeeService.getEmployees(params);
      setEmployees(data || []);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load employees.";
      setError(message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [search, branchFilter, designationFilter, statusFilter]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadEmployees]);

  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, designationFilter, statusFilter]);

  const handleSearchChange = (value) => {
    setSearch(value);
    const next = value.trim();
    if (next) setSearchParams({ q: next });
    else setSearchParams({});
  };

  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return employees.slice(start, start + PAGE_SIZE);
  }, [employees, page]);

  const openCreate = () => {
    setEditingEmployee(null);
    setOpenDrawer(true);
  };

  const openEdit = (employee) => {
    setViewingEmployee(null);
    setEditingEmployee(employee);
    setOpenDrawer(true);
  };

  const openView = (employee) => {
    setViewingEmployee(employee);
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Delete employee "${employee.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await employeeService.deleteEmployee(employee._id);
      notifySuccess("Employee deleted");
      loadEmployees();
    } catch (err) {
      notifyError(err.response?.data?.message || "Failed to delete employee.");
    }
  };

  const getBranchName = (employee) => {
    if (employee.branch && typeof employee.branch === "object") {
      return employee.branch.name || "—";
    }
    const match = branches.find((b) => b._id === employee.branch);
    return match?.name || "—";
  };

  const avatarSrc = (employee) =>
    employee.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || "E")}&background=2563eb&color=fff`;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-600 text-sm font-semibold uppercase">
              Employee Management
            </p>

            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Employees</h1>

            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Manage employees across all company branches.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium shadow w-full sm:w-auto"
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search name, phone, or ID..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="all">All Designations</option>
              {designations.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="table-scroll">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Employee</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Employee ID
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Device PIN
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Designation
                </th>
                <th className="px-6 py-4 text-left font-semibold">Phone</th>
                <th className="px-6 py-4 text-left font-semibold">Branch</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20">
                    <div className="flex justify-center">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : pagedEmployees.length > 0 ? (
                pagedEmployees.map((employee) => (
                  <tr
                    key={employee._id}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarSrc(employee)}
                          alt={employee.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />

                        <div>
                          <h4 className="font-semibold">{employee.name}</h4>
                          <p className="text-xs text-slate-500">
                            {employee.role}
                          </p>
                          {employee.hasFieldPassword && (
                            <span className="mt-1 inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 text-blue-700">
                              Field app access
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {employee.employeeId}
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {employee.devicePin || "—"}
                    </td>

                    <td className="px-6 py-4">{employee.designation}</td>

                    <td className="px-6 py-4 text-slate-600">
                      {employee.phone}
                    </td>

                    <td className="px-6 py-4">{getBranchName(employee)}</td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          employee.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title="View"
                          onClick={() => openView(employee)}
                          className="w-9 h-9 rounded-xl border hover:bg-slate-100 inline-flex items-center justify-center"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(employee)}
                          className="w-9 h-9 rounded-xl border hover:bg-slate-100 inline-flex items-center justify-center"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(employee)}
                          className="w-9 h-9 rounded-xl border hover:bg-red-50 text-red-600 inline-flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-20">
                    <div className="flex flex-col items-center px-4">
                      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users size={36} className="text-blue-600" />
                      </div>

                      <h2 className="text-xl font-semibold mt-5">
                        No Employees Found
                      </h2>

                      <p className="text-slate-500 mt-2 text-center">
                        Try adjusting your filters or add a new employee.
                      </p>

                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl"
                      >
                        <Plus size={18} />
                        Add Employee
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={employees.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      <EmployeeViewCard
        open={Boolean(viewingEmployee)}
        employee={viewingEmployee}
        branchName={
          viewingEmployee ? getBranchName(viewingEmployee) : ""
        }
        onClose={() => setViewingEmployee(null)}
        onEdit={(employee) => openEdit(employee)}
      />

      <AddEmployeeDrawer
        open={openDrawer}
        employee={editingEmployee}
        branches={branches}
        onClose={() => {
          setOpenDrawer(false);
          setEditingEmployee(null);
        }}
        onSaved={loadEmployees}
      />
    </>
  );
};

export default EmployeesPage;
