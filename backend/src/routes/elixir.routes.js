import { Router } from "express";
import { 
    addElixir,
    getElixirs,
    updateElixir,
    extendEndDate,
    toggleStatus,
    deleteElixir,
} from "../controllers/elixir.controller.js";
import { requireAuth } from "@clerk/express";
const router = Router();

router.post("/add", requireAuth(), addElixir);
router.get("/", requireAuth(), getElixirs);
router.post("/extend/:id", requireAuth(), extendEndDate);
router.post("/toggle/:id", requireAuth(), toggleStatus);
router.put("/update/:id", requireAuth(), updateElixir);
router.delete("/:id", requireAuth(), deleteElixir);

export default router;