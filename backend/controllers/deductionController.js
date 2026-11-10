import Deduction from "../models/Deduction.js";
import Employee from "../models/Employee.js";
import asyncHandler from "../utils/asyncHandler.js";
import { companyQuery } from "../utils/companyScope.js";

// @route GET /api/deductions
export const getDeductions = asyncHandler(async (req, res) => {
  const { employee, branch, from, to, date } = req.query;
  const query = companyQuery(req);

  if (employee) query.employee = employee;
  if (branch && branch !== "all") query.branch = branch;
  if (date) query.date = date;
  if (from || to) {
    query.date = query.date || {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  const rows = await Deduction.find(query)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode")
    .sort({ date: -1, createdAt: -1 });

  res.json({ success: true, count: rows.length, data: rows });
});

// @route POST /api/deductions
export const createDeduction = asyncHandler(async (req, res) => {
  const { employee: employeeId, date, amount, note } = req.body;

  if (!employeeId || !date) {
    res.status(400);
    throw new Error("Employee and date are required");
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    res.status(400);
    throw new Error("Amount must be a non-negative number");
  }

  const employee = await Employee.findOne(
    companyQuery(req, { _id: employeeId })
  );
  if (!employee) {
    res.status(404);
    throw new Error("Employee not found");
  }

  const row = await Deduction.create({
    company: req.companyId,
    employee: employee._id,
    branch: employee.branch,
    date: String(date).trim(),
    amount: amt,
    note: String(note || "").trim(),
    createdBy: req.companyId,
  });

  const populated = await Deduction.findById(row._id)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode");

  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/deductions/:id
export const updateDeduction = asyncHandler(async (req, res) => {
  const row = await Deduction.findOne(companyQuery(req, { _id: req.params.id }));
  if (!row) {
    res.status(404);
    throw new Error("Deduction not found");
  }

  if (req.body.amount !== undefined) {
    const amt = Number(req.body.amount);
    if (!Number.isFinite(amt) || amt < 0) {
      res.status(400);
      throw new Error("Amount must be a non-negative number");
    }
    row.amount = amt;
  }
  if (req.body.date !== undefined) row.date = String(req.body.date).trim();
  if (req.body.note !== undefined) row.note = String(req.body.note).trim();

  if (req.body.employee) {
    const employee = await Employee.findOne(
      companyQuery(req, { _id: req.body.employee })
    );
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    row.employee = employee._id;
    row.branch = employee.branch;
  }

  await row.save();

  const populated = await Deduction.findById(row._id)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode");

  res.json({ success: true, data: populated });
});

// @route DELETE /api/deductions/:id
export const deleteDeduction = asyncHandler(async (req, res) => {
  const row = await Deduction.findOneAndDelete(
    companyQuery(req, { _id: req.params.id })
  );
  if (!row) {
    res.status(404);
    throw new Error("Deduction not found");
  }
  res.json({ success: true, message: "Deduction deleted" });
});
