import TaClaim from "../models/TaClaim.js";
import Employee from "../models/Employee.js";
import asyncHandler from "../utils/asyncHandler.js";
import { companyQuery } from "../utils/companyScope.js";

// @route GET /api/ta-claims
export const getTaClaims = asyncHandler(async (req, res) => {
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

  const claims = await TaClaim.find(query)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode")
    .sort({ date: -1, createdAt: -1 });

  res.json({ success: true, count: claims.length, data: claims });
});

// @route POST /api/ta-claims
export const createTaClaim = asyncHandler(async (req, res) => {
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

  const claim = await TaClaim.create({
    company: req.companyId,
    employee: employee._id,
    branch: employee.branch,
    date: String(date).trim(),
    amount: amt,
    note: String(note || "").trim(),
    createdBy: req.companyId,
  });

  const populated = await TaClaim.findById(claim._id)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode");

  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/ta-claims/:id
export const updateTaClaim = asyncHandler(async (req, res) => {
  const claim = await TaClaim.findOne(companyQuery(req, { _id: req.params.id }));
  if (!claim) {
    res.status(404);
    throw new Error("TA claim not found");
  }

  if (req.body.amount !== undefined) {
    const amt = Number(req.body.amount);
    if (!Number.isFinite(amt) || amt < 0) {
      res.status(400);
      throw new Error("Amount must be a non-negative number");
    }
    claim.amount = amt;
  }
  if (req.body.date !== undefined) claim.date = String(req.body.date).trim();
  if (req.body.note !== undefined) claim.note = String(req.body.note).trim();

  if (req.body.employee) {
    const employee = await Employee.findOne(
      companyQuery(req, { _id: req.body.employee })
    );
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    claim.employee = employee._id;
    claim.branch = employee.branch;
  }

  await claim.save();

  const populated = await TaClaim.findById(claim._id)
    .populate("employee", "name employeeId")
    .populate("branch", "name city cityCode");

  res.json({ success: true, data: populated });
});

// @route DELETE /api/ta-claims/:id
export const deleteTaClaim = asyncHandler(async (req, res) => {
  const claim = await TaClaim.findOneAndDelete(
    companyQuery(req, { _id: req.params.id })
  );
  if (!claim) {
    res.status(404);
    throw new Error("TA claim not found");
  }
  res.json({ success: true, message: "TA claim deleted" });
});
