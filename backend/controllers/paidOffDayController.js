import PaidOffDay from "../models/PaidOffDay.js";
import Branch from "../models/Branch.js";
import asyncHandler from "../utils/asyncHandler.js";
import { companyQuery } from "../utils/companyScope.js";

const TYPES = ["Public Holiday", "Strike", "Other"];

const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());

// @route GET /api/paid-off-days
export const getPaidOffDays = asyncHandler(async (req, res) => {
  const { branch, from, to, date } = req.query;
  const query = companyQuery(req);

  if (date) {
    query.date = String(date).trim();
  } else if (from || to) {
    query.date = {};
    if (from) query.date.$gte = String(from).trim();
    if (to) query.date.$lte = String(to).trim();
  }

  // Branch filter: include company-wide (null) + selected branch
  if (branch && branch !== "all") {
    query.$or = [{ branch: null }, { branch }];
  }

  const rows = await PaidOffDay.find(query)
    .populate("branch", "name city cityCode")
    .sort({ date: -1, createdAt: -1 });

  res.json({ success: true, count: rows.length, data: rows });
});

// @route POST /api/paid-off-days
export const createPaidOffDay = asyncHandler(async (req, res) => {
  const date = String(req.body.date || "").trim();
  const type = String(req.body.type || "Public Holiday").trim();
  const note = String(req.body.note || "").trim();
  const scope = String(req.body.scope || "branch").trim(); // branch | all
  const branchId = req.body.branch || null;

  if (!isYmd(date)) {
    res.status(400);
    throw new Error("date must be YYYY-MM-DD");
  }
  if (!TYPES.includes(type)) {
    res.status(400);
    throw new Error(`type must be one of: ${TYPES.join(", ")}`);
  }

  let branch = null;
  if (scope !== "all") {
    if (!branchId) {
      res.status(400);
      throw new Error("branch is required when scope is branch");
    }
    const found = await Branch.findOne(companyQuery(req, { _id: branchId }));
    if (!found) {
      res.status(404);
      throw new Error("Branch not found");
    }
    branch = found._id;
  }

  const existing = await PaidOffDay.findOne(
    companyQuery(req, { date, branch: branch || null })
  );
  if (existing) {
    res.status(400);
    throw new Error(
      branch
        ? "This date is already marked paid-off for this branch"
        : "This date is already marked paid-off for all branches"
    );
  }

  const row = await PaidOffDay.create({
    company: req.companyId,
    branch: branch || null,
    date,
    type,
    note,
    createdBy: req.companyId,
  });

  const populated = await PaidOffDay.findById(row._id).populate(
    "branch",
    "name city cityCode"
  );

  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/paid-off-days/:id
export const updatePaidOffDay = asyncHandler(async (req, res) => {
  const row = await PaidOffDay.findOne(
    companyQuery(req, { _id: req.params.id })
  );
  if (!row) {
    res.status(404);
    throw new Error("Paid-off day not found");
  }

  if (req.body.type !== undefined) {
    const type = String(req.body.type).trim();
    if (!TYPES.includes(type)) {
      res.status(400);
      throw new Error(`type must be one of: ${TYPES.join(", ")}`);
    }
    row.type = type;
  }
  if (req.body.note !== undefined) {
    row.note = String(req.body.note || "").trim();
  }
  if (req.body.date !== undefined) {
    const date = String(req.body.date).trim();
    if (!isYmd(date)) {
      res.status(400);
      throw new Error("date must be YYYY-MM-DD");
    }
    row.date = date;
  }

  await row.save();
  const populated = await PaidOffDay.findById(row._id).populate(
    "branch",
    "name city cityCode"
  );
  res.json({ success: true, data: populated });
});

// @route DELETE /api/paid-off-days/:id
export const deletePaidOffDay = asyncHandler(async (req, res) => {
  const row = await PaidOffDay.findOneAndDelete(
    companyQuery(req, { _id: req.params.id })
  );
  if (!row) {
    res.status(404);
    throw new Error("Paid-off day not found");
  }
  res.json({ success: true, message: "Paid-off day deleted" });
});
