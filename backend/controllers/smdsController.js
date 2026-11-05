import asyncHandler from "../utils/asyncHandler.js";
import {
  smdsConfigured,
  smdsGetBu,
  smdsGetParty,
} from "../services/smdsClient.js";
import { syncSmdsAttendanceForDate } from "../services/smdsSyncService.js";
import { toDateKey } from "../utils/companyTime.js";

// @route GET /api/smds/status
export const getSmdsStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      configured: smdsConfigured(),
      baseUrl: process.env.SMDS_BASE_URL || "https://sds.adilagencies.net/api/integration/v1",
    },
  });
});

// @route GET /api/smds/bu
export const listSmdsBu = asyncHandler(async (req, res) => {
  if (!smdsConfigured()) {
    res.status(400);
    throw new Error("SMDS credentials not configured on server");
  }
  const data = await smdsGetBu();
  res.json({ success: true, data: data.data || [] });
});

// @route GET /api/smds/party
export const listSmdsParty = asyncHandler(async (req, res) => {
  const { buGuid, partyType } = req.query;
  if (!buGuid) {
    res.status(400);
    throw new Error("buGuid is required");
  }
  if (!smdsConfigured()) {
    res.status(400);
    throw new Error("SMDS credentials not configured on server");
  }
  const data = await smdsGetParty(buGuid, partyType || "salesman");
  res.json({ success: true, data: data.data || [] });
});

// @route POST /api/smds/sync
export const syncSmds = asyncHandler(async (req, res) => {
  const date = req.body.date || req.query.date || toDateKey(new Date());
  const branchId = req.body.branchId || req.query.branchId;

  const result = await syncSmdsAttendanceForDate({
    companyId: req.companyId,
    date,
    branchId,
  });

  res.json({ success: true, data: result });
});
