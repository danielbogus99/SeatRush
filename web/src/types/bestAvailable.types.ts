export interface BestAvailableInput {
  fan_id: string;
  quantity: number;
  zone_id?: string;
  max_price_agorot?: number;
}

export interface BestAvailableResult {
  seat_ids: string[];
}

export interface BestAvailableErrorResponse {
  error: string;
}
