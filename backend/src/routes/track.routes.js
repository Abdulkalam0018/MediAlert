import { Router } from "express";
import { 
    sync,
    getAllTracks,
    getTrackById,
    getTodayTracks,
    updateTrackTimingStatus
} from "../controllers/track.controller.js";
import { requireAuth } from "@clerk/express";

const router = Router();

router.post("/sync", sync);
router.get("/all", requireAuth(), getAllTracks);
router.get("/today", requireAuth(), getTodayTracks);
router.get("/:id", requireAuth(), getTrackById);
router.patch("/:id", requireAuth(), updateTrackTimingStatus);

export default router;