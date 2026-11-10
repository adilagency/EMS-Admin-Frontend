import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import companyRoutes from "./routes/companyRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import fieldRoutes from "./routes/fieldRoutes.js";
import taClaimRoutes from "./routes/taClaimRoutes.js";
import deductionRoutes from "./routes/deductionRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import smdsRoutes from "./routes/smdsRoutes.js";
import { startAutoCloseFieldSessionsJob } from "./jobs/autoCloseFieldSessions.js";
import { startSmdsAttendanceSyncJob } from "./jobs/smdsAttendanceSync.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow browser admin + Electron/agent requests (no Origin header)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "EMS API is running" })
);

app.use("/api/company", companyRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/field", fieldRoutes);
app.use("/api/ta-claims", taClaimRoutes);
app.use("/api/deductions", deductionRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/smds", smdsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    startAutoCloseFieldSessionsJob();
    startSmdsAttendanceSyncJob();
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
