import { Router } from "express";
import { redirectToGoogle, handleGoogleCallback } from "../controllers/google.controller.js";
const router = Router();

router.get("/auth", redirectToGoogle);
router.get("/auth/google/callback", handleGoogleCallback);

export default router;