import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";
import { formatClock, toDateKey } from "../utils/companyTime.js";
import {
  smdsConfigured,
  smdsGetBookingOrder,
} from "./smdsClient.js";

const DELAY_MS = Number(process.env.SMDS_SYNC_DELAY_MS || 900);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sync SMDS first-order → EMS Present for employees with smdsPartyCode
 * on branches that have smdsBuGuid set.
 */
export const syncSmdsAttendanceForDate = async ({
  companyId,
  date,
  branchId,
} = {}) => {
  if (!smdsConfigured()) {
    return {
      ok: false,
      message: "SMDS not configured",
      synced: 0,
      skipped: 0,
      errors: [],
    };
  }

  const day = date || toDateKey(new Date());
  const branchQuery = {
    company: companyId,
    smdsBuGuid: { $exists: true, $nin: ["", null] },
  };
  if (branchId) branchQuery._id = branchId;

  const branches = await Branch.find(branchQuery).lean();
  if (!branches.length) {
    return {
      ok: true,
      message: "No branches with smdsBuGuid",
      date: day,
      synced: 0,
      skipped: 0,
      errors: [],
    };
  }

  let synced = 0;
  let skipped = 0;
  const errors = [];
  const details = [];

  for (const branch of branches) {
    const employees = await Employee.find({
      company: companyId,
      branch: branch._id,
      status: "Active",
      smdsPartyCode: { $exists: true, $nin: ["", null] },
    }).lean();

    for (const emp of employees) {
      try {
        await sleep(DELAY_MS);
        const res = await smdsGetBookingOrder(
          branch.smdsBuGuid,
          String(emp.smdsPartyCode).trim(),
          day
        );
        const payload = res.data || {};
        const status = String(payload.orderStatus || "").toLowerCase();

        if (status !== "booked" || !payload.firstOrderAt) {
          skipped += 1;
          details.push({
            employeeId: emp.employeeId,
            partyCode: emp.smdsPartyCode,
            result: "no_order",
          });
          continue;
        }

        const punchedAt = new Date(payload.firstOrderAt);
        const checkIn = formatClock(punchedAt);

        const existing = await Attendance.findOne({
          company: companyId,
          employee: emp._id,
          date: day,
        });

        // Do not overwrite biometric / manual if already present that day
        if (
          existing &&
          existing.method &&
          !["SMDS", "GPS", "--"].includes(existing.method)
        ) {
          skipped += 1;
          details.push({
            employeeId: emp.employeeId,
            result: "kept_existing",
            method: existing.method,
          });
          continue;
        }

        await Attendance.findOneAndUpdate(
          { company: companyId, employee: emp._id, date: day },
          {
            $set: {
              company: companyId,
              employee: emp._id,
              branch: branch._id,
              date: day,
              checkIn,
              method: "SMDS",
              status: "Present",
              note: existing?.note || "SMDS first order",
            },
            $setOnInsert: {
              checkOut: "--",
              hours: "--",
            },
          },
          { upsert: true, new: true }
        );

        synced += 1;
        details.push({
          employeeId: emp.employeeId,
          partyCode: emp.smdsPartyCode,
          result: "present",
          checkIn,
        });
      } catch (err) {
        errors.push({
          employeeId: emp.employeeId,
          partyCode: emp.smdsPartyCode,
          message: err.message,
          code: err.code,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    date: day,
    synced,
    skipped,
    errors,
    details,
  };
};
