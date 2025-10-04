import { Router } from "express";
import { sync } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
const router = Router();

router.get("/sync", requireAuth(), sync)

export default router;