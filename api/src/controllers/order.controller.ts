import type { Request, Response } from "express";
import { checkout, getFanOrders } from "@/services/order.service";
import type { CheckoutInput } from "@/types/order.types";

export async function checkoutController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const holdId = req.params.holdId as string;
    const data = req.body as CheckoutInput;

    const result = await checkout(holdId, data);

    res.status(result.created ? 201 : 200).json(result.order);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    let status = 500;

    if (
      message === "Invalid checkout information" ||
      message === "Invalid promo code"
    ) {
      status = 400;
    } else if (message === "Hold not found") {
      status = 404;
    } else if (message === "You do not own this hold") {
      status = 403;
    } else if (
      message === "Hold is not active" ||
      message === "Hold has expired" ||
      message === "Hold has no valid seats" ||
      message === "Hold is no longer active" ||
      message === "Promo code already used"
    ) {
      status = 409;
    } else {
      console.error("Checkout failed:", error);
    }

    res.status(status).json({
      error: status === 500 ? "Internal server error" : message,
    });
  }
}

export async function getFanOrdersController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const fanId = req.params.fanId;

    if (typeof fanId !== "string") {
      res.status(400).json({
        error: "Invalid fan ID",
      });
      return;
    }

    const orders = await getFanOrders(fanId);

    res.status(200).json(orders);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    if (message === "Invalid fan ID") {
      res.status(400).json({
        error: message,
      });
      return;
    }

    console.error("Get Fan Orders Error:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
