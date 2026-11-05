import express from "express";
import {
  getSmdsStatus,
  listSmdsBu,
  listSmdsParty,
  syncSmds,
} from "../controllers/smdsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/status", getSmdsStatus);
router.get("/bu", listSmdsBu);
router.get("/party", listSmdsParty);
router.post("/sync", syncSmds);

export default router;
