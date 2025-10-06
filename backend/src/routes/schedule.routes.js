import { Router } from "express";
import { createSchedule, getSchedules } from "../controllers/schedule.controller.js";
import { requireAuth } from "@clerk/express";

const router = Router();

router.post("/create", requireAuth(), createSchedule);
router.get("/schedules", requireAuth(), getSchedules);

export default router;