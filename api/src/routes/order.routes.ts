
import { Router } from "express";
import { checkoutController, getFanOrdersController } from "@/controllers/order.controller";

const router = Router();

router.post("/holds/:holdId/checkout", checkoutController);

router.get("/fans/:fanId/orders", getFanOrdersController);

export default router;
