
import type { Request, Response } from "express";
import { createHold, releaseHold } from "@/services/hold.service";
import type { CreateHoldInput } from "@/types/hold.types";

export async function createHoldController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const eventId = req.params.eventId as string;
    const data = req.body as CreateHoldInput;

    const hold = await createHold(eventId, data);

    res.status(201).json(hold);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    let status = 500;

        if (
    message === "Invalid hold information" ||
    message === "Duplicate seats are not allowed" ||
    message === "Invalid UUID"
    ) {
    status = 400;
    } else if (message === "Event is not on sale yet") {
      status = 403;
    } else if (
      message === "One or more seats are unavailable" ||
      message === "Seat limit exceeded"
    ) {
      status = 409;
    } else {
      console.error("Create hold failed:", error);
    }

    res.status(status).json({
      error: status === 500 ? "Internal server error" : message,
    });
  }
}

export async function releaseHoldController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const holdId = req.params.holdId as string;
    const fanId = req.body?.fan_id;

    if (typeof fanId !== "string") {
      res.status(400).json({
        error: "Invalid hold information",
      });
      return;
    }

    await releaseHold(holdId, fanId);

    res.status(200).json({
      message: "Hold released successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    let status = 500;

    if (message === "Invalid UUID") {
      status = 400;
    } else if (message === "Hold not found") {
      status = 404;
    } else if (message === "You do not own this hold") {
      status = 403;
    } else if (
      message === "Completed hold cannot be released" ||
      message === "Hold already released"
    ) {
      status = 409;
    } else {
      console.error("Release hold failed:", error);
    }

    res.status(status).json({
      error: status === 500 ? "Internal server error" : message,
    });
  }
}
