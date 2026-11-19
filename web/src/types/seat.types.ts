import type { Event } from "@/types/event.types";

export type SeatStatus = "AVAILABLE" | "HELD" | "SOLD";

export interface Seat {
  id: string;
  event_id: string;
  zone_id: string;
  zone_name: string;
  price_agorot: number;
  row_label: string;
  seat_number: number;
  status: SeatStatus;
}

export interface EventDetailsResponse {
  event: Event;
  seats: Seat[];
}
