import { Router } from "express";
import { createRoom, getRoom, getMatchHistory, saveBotGame } from "../controllers/gameController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/rooms",         requireAuth, createRoom);
router.get("/rooms/:id",      getRoom);
router.get("/games/history",  requireAuth, getMatchHistory);
router.post("/games/bot",     requireAuth, saveBotGame);

export default router;
