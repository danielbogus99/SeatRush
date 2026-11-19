import { Router } from "express";
import { createHoldController, releaseHoldController } from "@/controllers/hold.controller";

const router = Router();

router.post("/events/:eventId/holds", createHoldController);

router.delete("/holds/:holdId", releaseHoldController);

export default router;
