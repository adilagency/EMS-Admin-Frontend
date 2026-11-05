import express from "express";
import {
  getTaClaims,
  createTaClaim,
  updateTaClaim,
  deleteTaClaim,
} from "../controllers/taClaimController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getTaClaims).post(createTaClaim);
router.route("/:id").put(updateTaClaim).delete(deleteTaClaim);

export default router;
