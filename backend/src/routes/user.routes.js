import { Router } from "express";
import { sync, test, me, saveFcmToken } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
const router = Router();

router.get("/test", test)
router.get("/sync", requireAuth(), sync)
router.post("/fcm-token", requireAuth(), saveFcmToken)
router.get("/me", requireAuth(), me)

export default router;