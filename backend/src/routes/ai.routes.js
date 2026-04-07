import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { askAI } from "../controllers/ai.controller.js";

const router = Router();

router.post("/ask", requireAuth(), askAI);

export default router;
