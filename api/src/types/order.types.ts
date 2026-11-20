export type PromoCode = "SAVE10" | "WELCOME20";

export interface CheckoutInput {
  fan_id: string;
  promo_code?: string | null;
}

export interface OrderRow {
  id: string;
  hold_id: string;
  fan_id: string;
  subtotal_agorot: number;
  promo_code: PromoCode | null;
  discount_agorot: number;
  total_agorot: number;
  created_at: Date;
}

export interface CheckoutResult {
  order_id: string;
  hold_id: string;
  fan_id: string;
  subtotal_agorot: number;
  promo_code: PromoCode | null;
  discount_agorot: number;
  total_agorot: number;
  created_at: Date;
}

export interface CheckoutServiceResult {
  order: CheckoutResult;
  created: boolean;
}

export interface MyTicketRow {
  order_id: string;
  event_id: string;
  event_name: string;
  venue: string;
  starts_at: Date;
  subtotal_agorot: number;
  promo_code: PromoCode | null;
  discount_agorot: number;
  total_agorot: number;
  created_at: Date;
  seat_ids: string[];
}

export interface MyTicketResult {
  order_id: string;
  event_id: string;
  event_name: string;
  venue: string;
  starts_at: Date;
  subtotal_agorot: number;
  promo_code: PromoCode | null;
  discount_agorot: number;
  total_agorot: number;
  created_at: Date;
  seat_ids: string[];
}
