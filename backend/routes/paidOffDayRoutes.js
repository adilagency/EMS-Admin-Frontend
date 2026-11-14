import express from "express";
import {
  getPaidOffDays,
  createPaidOffDay,
  updatePaidOffDay,
  deletePaidOffDay,
} from "../controllers/paidOffDayController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getPaidOffDays).post(createPaidOffDay);
router.route("/:id").put(updatePaidOffDay).delete(deletePaidOffDay);

export default router;
