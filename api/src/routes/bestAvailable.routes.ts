import { Router } from "express";
import { createBestAvailableHoldController } from "@/controllers/bestAvailable.controller";

const router = Router();

router.post(
  "/events/:eventId/best-available",
  createBestAvailableHoldController
);

export default router;
