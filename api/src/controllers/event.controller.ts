import type { Request, Response } from "express";
import { createEvent, getAllEvents, getEventDetails } from "@/services/event.service";
import type { CreateEventInput } from "@/types/event.types";

export async function createEventController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const data = req.body as CreateEventInput;

    const eventId = await createEvent(data);

    res.status(201).json({
      message: "Event created successfully",
      event_id: eventId,
    });
  } catch (error) {
    console.error("Failed to create event:", error);

    if (error instanceof Error) {
      const validationMessages = [
        "Invalid event information",
        "Invalid event dates",
        "At least one zone is required",
        "Invalid price zone",
        "Invalid zone row range",
        "Overlapping price zones",
        "Price zones must cover all rows",
        "Missing price zone",
      ];

      if (validationMessages.includes(error.message)) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

export async function getAllEventsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const events = await getAllEvents();

    res.status(200).json({
      events,
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

export async function getEventDetailsController(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const details = await getEventDetails(id);

    if (!details) {
      res.status(404).json({
        error: "Event not found",
      });
      return;
    }

    res.status(200).json(details);
  } catch (error) {
    console.error("Failed to fetch event details:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
