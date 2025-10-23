import { Router } from "express";
import { 
    redirectToGoogle, 
    handleGoogleCallback,
    syncCalendar,
    disconnectCalendar,
    toggleCalendarSync,
    getCalendarStatus,
    deleteAllCalendarEvents
} from "../controllers/google.controller.js";

const router = Router();

// OAuth routes
router.get("/auth/:userId", redirectToGoogle);
router.get("/auth/google/callback", handleGoogleCallback);

// Calendar management routes
router.post("/sync", syncCalendar);
router.post("/disconnect", disconnectCalendar);
router.post("/toggle-sync", toggleCalendarSync);
router.get("/status", getCalendarStatus);
router.delete("/events", deleteAllCalendarEvents);

export default router;