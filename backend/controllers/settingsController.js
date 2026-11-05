import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";

const ensureSettings = async (companyId) => {
  let settings = await Settings.findOne({ company: companyId });
  if (!settings) {
    settings = await Settings.create({ company: companyId });
  }
  return settings;
};

// @route  GET /api/settings
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await ensureSettings(req.companyId);
  res.json({ success: true, data: settings });
});

// @route  PUT /api/settings
export const updateSettings = asyncHandler(async (req, res) => {
  const {
    officeTimings,
    workingDays,
    attendanceRules,
    gpsRules,
    alertSettings,
    payrollRules,
  } = req.body;

  const settings = await ensureSettings(req.companyId);

  if (officeTimings) {
    settings.officeTimings = {
      ...settings.officeTimings.toObject?.() || settings.officeTimings,
      ...officeTimings,
    };
  }

  if (workingDays) {
    settings.workingDays = workingDays;
  }

  if (attendanceRules) {
    settings.attendanceRules = {
      ...(settings.attendanceRules.toObject?.() || settings.attendanceRules),
      ...attendanceRules,
    };
  }

  if (gpsRules) {
    settings.gpsRules = {
      ...(settings.gpsRules.toObject?.() || settings.gpsRules),
      ...gpsRules,
    };
  }

  if (alertSettings) {
    settings.alertSettings = {
      ...(settings.alertSettings.toObject?.() || settings.alertSettings),
      ...alertSettings,
    };
  }

  if (payrollRules) {
    settings.payrollRules = {
      ...(settings.payrollRules?.toObject?.() || settings.payrollRules || {}),
      ...payrollRules,
    };
  }

  await settings.save();

  res.json({ success: true, data: settings, message: "Settings updated" });
});
