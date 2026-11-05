import Company from "../models/Company.js";
import { toDateKey } from "../utils/companyTime.js";
import { smdsConfigured } from "../services/smdsClient.js";
import { syncSmdsAttendanceForDate } from "../services/smdsSyncService.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Periodic SMDS attendance sync (all companies with mapped employees).
 * Runs every SMDS_SYNC_INTERVAL_MS (default 1 hour).
 */
export const startSmdsAttendanceSyncJob = () => {
  if (!smdsConfigured()) {
    console.log("SMDS sync job skipped (credentials not set)");
    return;
  }

  const interval = Number(process.env.SMDS_SYNC_INTERVAL_MS || HOUR_MS);

  const tick = async () => {
    try {
      const companies = await Company.find({}).select("_id").lean();
      const date = toDateKey(new Date());
      for (const c of companies) {
        const result = await syncSmdsAttendanceForDate({
          companyId: c._id,
          date,
        });
        if (result.synced || result.errors?.length) {
          console.log(
            `SMDS sync company=${c._id} date=${date} synced=${result.synced} skipped=${result.skipped} errors=${result.errors?.length || 0}`
          );
        }
      }
    } catch (err) {
      console.error("SMDS sync job failed:", err.message);
    }
  };

  // First run a few minutes after boot
  setTimeout(tick, 90_000);
  setInterval(tick, interval);
  console.log(`SMDS attendance sync job started (every ${interval}ms)`);
};
