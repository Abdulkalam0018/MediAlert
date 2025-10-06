import { Router } from "express";
import { 
    addElixir,
    getElixirs,
    updateElixir,
    deleteElixir,
} from "../controllers/elixir.controller.js";
import { requireAuth } from "@clerk/express";
const router = Router();

router.post("/add", requireAuth(), addElixir);
router.get("/", requireAuth(), getElixirs);
router.put("/update/:id", requireAuth(), updateElixir);
router.delete("/:id", requireAuth(), deleteElixir);

export default router;