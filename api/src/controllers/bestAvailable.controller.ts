import type { Request, Response } from "express";
import { createBestAvailableHold } from "@/services/bestAvailable.service";
import type { BestAvailableInput } from "@/types/bestAvailable.types";

export async function createBestAvailableHoldController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { eventId } = req.params;

    const input: BestAvailableInput = req.body;

    const result = await createBestAvailableHold(
      eventId as string,
      input
    );

    res.status(201).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (
      message === "Invalid best available information" ||
      message === "Invalid UUID" ||
      message === "Invalid maximum price"
    ) {
      res.status(400).json({ error: message });
      return;
    }

    if (
      message === "Event not found" ||
      message === "Fan not found"
    ) {
      res.status(404).json({ error: message });
      return;
    }

    if (
      message === "Not enough adjacent seats available" ||
      message === "One or more seats are unavailable" ||
      message === "Seat limit exceeded" ||
      message === "Event is not on sale yet"
    ) {
      res.status(409).json({ error: message });
      return;
    }

    console.error("Best Available Hold Error:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
