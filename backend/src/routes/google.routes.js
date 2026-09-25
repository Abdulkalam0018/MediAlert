import { Router } from "express";
import { 
    getGoogleAuthUrl,
    handleGoogleCallback,
    syncCalendar,
    disconnectCalendar,
    toggleCalendarSync,
    getCalendarStatus
} from "../controllers/google.controller.js";

const router = Router();

// OAuth routes
// The frontend asks for a signed consent URL (handler returns 401 without a
// Clerk session), then navigates to it.
// The old unauthenticated GET /auth/:userId route has been removed on purpose.
router.post("/auth/url", getGoogleAuthUrl);
router.get("/auth/google/callback", handleGoogleCallback);

// Calendar management routes
router.post("/sync", syncCalendar);
router.post("/disconnect", disconnectCalendar);
router.post("/toggle-sync", toggleCalendarSync);
router.get("/status", getCalendarStatus);

export default router;
