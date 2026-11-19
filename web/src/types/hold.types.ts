export interface CreateHoldInput {
  fan_id: string;
  seat_ids: string[];
}

export interface CreateHoldResult {
  hold_id: string;
  event_id: string;
  fan_id: string;
  seat_ids: string[];
  expires_at: string;
}

export interface ReleaseHoldInput {
  fan_id: string;
}

export interface ReleaseHoldResult {
  message: string;
}

export interface HoldErrorResponse {
  error: string;
}
