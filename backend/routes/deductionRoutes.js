import express from "express";
import {
  getDeductions,
  createDeduction,
  updateDeduction,
  deleteDeduction,
} from "../controllers/deductionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getDeductions).post(createDeduction);
router.route("/:id").put(updateDeduction).delete(deleteDeduction);

export default router;
