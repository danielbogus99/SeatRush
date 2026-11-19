
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

export interface EventRow {
  id: string;
  name: string;
  venue: string;
  starts_at: Date;
  on_sale_at: Date;
  row_count: number;
  seats_per_row: number;
  created_at: Date;
}

export type SeatStatus = "AVAILABLE" | "HELD" | "SOLD";

export interface EventSeatRow {
  id: string;
  event_id: string;
  zone_id: string;
  zone_name: string;
  price_agorot: number;
  row_label: string;
  seat_number: number;
  status: SeatStatus;
}

export interface EventDetails {
  event: EventRow;
  seats: EventSeatRow[];
}

