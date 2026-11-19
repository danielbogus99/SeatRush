export interface CheckoutInput {
  fan_id: string;
}

export interface CheckoutResult {
  order_id: string;
  hold_id: string;
  fan_id: string;
  total_agorot: number;
  created_at: string;
}

export interface CheckoutErrorResponse {
  error: string;
}
