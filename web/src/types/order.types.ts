export interface CheckoutInput {
  fan_id: string;
  promo_code?: string;
}

export interface CheckoutResult {
  order_id: string;
  hold_id: string;
  fan_id: string;
  subtotal_agorot: number;
  promo_code: string | null;
  discount_agorot: number;
  total_agorot: number;
  created_at: string;
}

export interface CheckoutErrorResponse {
  error: string;
}