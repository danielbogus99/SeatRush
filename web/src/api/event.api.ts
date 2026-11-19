import type { Event, EventsResponse } from "@/types/event.types";
import type { EventDetailsResponse } from "@/types/seat.types";

const API_BASE_URL = "http://localhost:3000/api";

export async function getEvents(): Promise<Event[]> {
  const response = await fetch(`${API_BASE_URL}/events`);

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  const data: EventsResponse = await response.json();

  return data.events;
}

export async function getEventById(
  eventId: string
): Promise<EventDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch event seats");
  }

  return response.json();
}
