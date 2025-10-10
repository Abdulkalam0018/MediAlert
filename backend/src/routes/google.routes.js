import { Router } from "express";
import { 
    redirectToGoogle, 
    handleGoogleCallback,
    syncCalendar,
    disconnectCalendar,
    toggleCalendarSync,
    getCalendarStatus
} from "../controllers/google.controller.js";

const router = Router();

// OAuth routes
router.get("/auth", redirectToGoogle);
router.get("/auth/google/callback", handleGoogleCallback);

// Calendar management routes
router.post("/sync", syncCalendar);
router.post("/disconnect", disconnectCalendar);
router.post("/toggle-sync", toggleCalendarSync);
router.get("/status", getCalendarStatus);

export default router;