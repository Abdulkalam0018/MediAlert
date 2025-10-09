import { Router } from "express";
import { 
    sync,
    getAllTracks,
    getTrackById,
    getTracksByDate,
    updateTrackTimingStatus,
    getAdherenceData
} from "../controllers/track.controller.js";
import { requireAuth } from "@clerk/express";

const router = Router();

router.post("/sync", sync);
router.get("/all", requireAuth(), getAllTracks);
router.get("/today", requireAuth(), getTracksByDate);
router.get("/date/:date", requireAuth(), getTracksByDate);
router.get("/adherence", requireAuth(), getAdherenceData);
router.get("/:id", requireAuth(), getTrackById);
router.patch("/:id", requireAuth(), updateTrackTimingStatus);

export default router;