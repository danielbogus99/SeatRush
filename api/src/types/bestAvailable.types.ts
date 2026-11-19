export interface BestAvailableInput {
  fan_id: string;
  quantity: number;
  zone_id?: string;
  max_price_agorot?: number;
}

export interface BestAvailableSeatRow {
  id: string;
  event_id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
  price_agorot: number;
  row_center: number;
}

export interface BestAvailableResult {
  seat_ids: string[];
}
