
import type { Event } from "@/types/event.types";
import { getEventById } from "@/api/event.api";

const API_URL = "http://localhost:3000/api";

export interface CreateZoneInput {
  name: string;
  price_agorot: number;
  start_row: string;
  end_row: string;
}

export interface CreateEventInput {
  name: string;
  venue: string;
  starts_at: string;
  on_sale_at: string;
  row_count: number;
  seats_per_row: number;
  zones: CreateZoneInput[];
}

interface CreateEventResponse {
  message: string;
  event_id: string;
}

export async function createEvent(
  input: CreateEventInput
): Promise<Event> {
  const response = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      throw new Error(data.error);
    }

    throw new Error(`Failed to create event (${response.status})`);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("event_id" in data) ||
    typeof data.event_id !== "string"
  ) {
    throw new Error("Invalid response from event creation API");
  }

  const result = data as unknown as CreateEventResponse;

  // Backend returns an ID, not the complete Event object.
  const details = await getEventById(result.event_id);

  return details.event;
}
