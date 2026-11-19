
export interface CreateHoldInput {
  fan_id: string;
  seat_ids: string[];
}

export interface HoldRow {
  id: string;
  event_id: string;
  fan_id: string;
  status: "ACTIVE" | "RELEASED" | "COMPLETED";
  expires_at: Date;
  created_at: Date;
}

export interface CreateHoldResult {
  hold_id: string;
  event_id: string;
  fan_id: string;
  seat_ids: string[];
  expires_at: Date;
}

export interface HoldSeatRow {
  id: string;
  event_id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
}