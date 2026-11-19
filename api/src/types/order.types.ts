export interface CheckoutInput {
  fan_id: string;
}

export interface OrderRow {
  id: string;
  hold_id: string;
  fan_id: string;
  total_agorot: number;
  created_at: Date;
}

export interface CheckoutResult {
  order_id: string;
  hold_id: string;
  fan_id: string;
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
  total_agorot: number;
  created_at: Date;
  seat_ids: string[];
}
