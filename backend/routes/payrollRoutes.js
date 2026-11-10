import express from "express";
import {
  getPeriods,
  createPeriod,
  calculatePeriod,
  getPayslips,
  approvePeriod,
} from "../controllers/payrollController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/periods", getPeriods);
router.post("/periods", createPeriod);
router.post("/periods/:id/calculate", calculatePeriod);
router.get("/periods/:id/payslips", getPayslips);
router.post("/periods/:id/approve", approvePeriod);

export default router;
