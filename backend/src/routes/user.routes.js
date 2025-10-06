import { Router } from "express";
import { sync, test } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
const router = Router();

router.get("/test", test)
router.get("/sync", requireAuth(), sync)

export default router;