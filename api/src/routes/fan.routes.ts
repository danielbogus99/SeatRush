import { Router } from "express";
import { loginFanController } from "@/controllers/fan.controller";

const router = Router();

router.post("/login", loginFanController);

export default router;
