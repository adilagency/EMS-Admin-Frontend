import PayrollPeriod from "../models/PayrollPeriod.js";
import Payslip from "../models/Payslip.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import TaClaim from "../models/TaClaim.js";
import Deduction from "../models/Deduction.js";
import Branch from "../models/Branch.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { companyQuery } from "../utils/companyScope.js";

const pad2 = (n) => String(n).padStart(2, "0");

const monthRange = (year, month) => {
  const from = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { from, to };
};

const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const ensureSettings = async (companyId) => {
  let settings = await Settings.findOne({ company: companyId });
  if (!settings) settings = await Settings.create({ company: companyId });
  return settings;
};

// @route GET /api/payroll/periods
export const getPeriods = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const query = companyQuery(req);
  if (branch && branch !== "all") query.branch = branch;

  const periods = await PayrollPeriod.find(query)
    .populate("branch", "name city cityCode")
    .sort({ year: -1, month: -1 });

  res.json({ success: true, count: periods.length, data: periods });
});

// @route POST /api/payroll/periods
export const createPeriod = asyncHandler(async (req, res) => {
  const branchId = req.body.branch;
  const year = Number(req.body.year);
  const month = Number(req.body.month);

  if (!branchId || !year || !month || month < 1 || month > 12) {
    res.status(400);
    throw new Error("branch, year, and month (1–12) are required");
  }

  const branch = await Branch.findOne(companyQuery(req, { _id: branchId }));
  if (!branch) {
    res.status(404);
    throw new Error("Branch not found");
  }

  const existing = await PayrollPeriod.findOne(
    companyQuery(req, { branch: branchId, year, month })
  );
  if (existing) {
    return res.json({ success: true, data: existing, message: "Period already exists" });
  }

  const settings = await ensureSettings(req.companyId);
  const workingDays =
    settings.payrollRules?.workingDaysInMonth ?? 26;

  const period = await PayrollPeriod.create({
    company: req.companyId,
    branch: branchId,
    year,
    month,
    status: "Draft",
    workingDaysInMonthSnapshot: workingDays,
  });

  res.status(201).json({ success: true, data: period });
});

// @route POST /api/payroll/periods/:id/calculate
export const calculatePeriod = asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findOne(
    companyQuery(req, { _id: req.params.id })
  );
  if (!period) {
    res.status(404);
    throw new Error("Payroll period not found");
  }
  if (period.status === "Approved") {
    res.status(400);
    throw new Error("Approved period cannot be recalculated");
  }

  const settings = await ensureSettings(req.companyId);
  const workingDays = Number(
    settings.payrollRules?.workingDaysInMonth ||
      period.workingDaysInMonthSnapshot ||
      26
  );

  const { from, to } = monthRange(period.year, period.month);

  const employees = await Employee.find({
    company: req.companyId,
    branch: period.branch,
    status: "Active",
  }).lean();

  const employeeIds = employees.map((e) => e._id);

  const [attendanceRows, taRows, dedRows] = await Promise.all([
    Attendance.find({
      company: req.companyId,
      branch: period.branch,
      employee: { $in: employeeIds },
      date: { $gte: from, $lte: to },
      status: { $in: ["Present", "Late"] },
    })
      .select("employee date status")
      .lean(),
    TaClaim.find({
      company: req.companyId,
      branch: period.branch,
      employee: { $in: employeeIds },
      date: { $gte: from, $lte: to },
    })
      .select("employee amount")
      .lean(),
    Deduction.find({
      company: req.companyId,
      branch: period.branch,
      employee: { $in: employeeIds },
      date: { $gte: from, $lte: to },
    })
      .select("employee amount")
      .lean(),
  ]);

  const daysByEmp = new Map();
  for (const a of attendanceRows) {
    const key = String(a.employee);
    daysByEmp.set(key, (daysByEmp.get(key) || 0) + 1);
  }

  const taByEmp = new Map();
  for (const t of taRows) {
    const key = String(t.employee);
    taByEmp.set(key, (taByEmp.get(key) || 0) + (Number(t.amount) || 0));
  }

  const dedByEmp = new Map();
  for (const d of dedRows) {
    const key = String(d.employee);
    dedByEmp.set(key, (dedByEmp.get(key) || 0) + (Number(d.amount) || 0));
  }

  await Payslip.deleteMany({ company: req.companyId, period: period._id });

  const slips = [];
  for (const emp of employees) {
    const key = String(emp._id);
    const payableDays = daysByEmp.get(key) || 0;
    const basicSalary = Number(emp.basicSalary) || 0;
    const dailyAllowanceRate = Number(emp.dailyAllowance) || 0;
    const dailyRate = workingDays > 0 ? basicSalary / workingDays : 0;
    const salaryPart = roundMoney(dailyRate * payableDays);
    const taTotal = roundMoney(taByEmp.get(key) || 0);
    const daTotal = roundMoney(dailyAllowanceRate * payableDays);
    const deductionTotal = roundMoney(dedByEmp.get(key) || 0);
    const net = roundMoney(salaryPart + taTotal + daTotal - deductionTotal);

    slips.push({
      company: req.companyId,
      period: period._id,
      employee: emp._id,
      branch: period.branch,
      basicSalary,
      dailyAllowanceRate,
      payableDays,
      workingDaysInMonth: workingDays,
      salaryPart,
      taTotal,
      daTotal,
      deductionTotal,
      net,
      employeeIdSnapshot: emp.employeeId || "",
      employeeNameSnapshot: emp.name || "",
    });
  }

  if (slips.length) await Payslip.insertMany(slips);

  period.status = "Calculated";
  period.workingDaysInMonthSnapshot = workingDays;
  period.calculatedAt = new Date();
  await period.save();

  const payslips = await Payslip.find({
    company: req.companyId,
    period: period._id,
  })
    .populate("employee", "name employeeId")
    .sort({ employeeIdSnapshot: 1 });

  res.json({
    success: true,
    data: { period, payslips },
    message: `Calculated ${payslips.length} payslips`,
  });
});

// @route GET /api/payroll/periods/:id/payslips
export const getPayslips = asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findOne(
    companyQuery(req, { _id: req.params.id })
  );
  if (!period) {
    res.status(404);
    throw new Error("Payroll period not found");
  }

  const payslips = await Payslip.find({
    company: req.companyId,
    period: period._id,
  })
    .populate("employee", "name employeeId")
    .sort({ employeeIdSnapshot: 1 });

  res.json({ success: true, count: payslips.length, data: payslips, period });
});

// @route POST /api/payroll/periods/:id/approve
export const approvePeriod = asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.findOne(
    companyQuery(req, { _id: req.params.id })
  );
  if (!period) {
    res.status(404);
    throw new Error("Payroll period not found");
  }
  if (period.status === "Draft") {
    res.status(400);
    throw new Error("Calculate payroll before approving");
  }
  if (period.status === "Approved") {
    return res.json({ success: true, data: period, message: "Already approved" });
  }

  period.status = "Approved";
  period.approvedAt = new Date();
  await period.save();

  res.json({ success: true, data: period, message: "Payroll period approved" });
});
