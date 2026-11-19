
import { Router } from "express";
import { createEventController, getAllEventsController, getEventDetailsController } from "@/controllers/event.controller";

const router = Router();

router.post("/", createEventController);
router.get("/", getAllEventsController);
router.get("/:id", getEventDetailsController);

export default router;
