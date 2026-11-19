export interface Event {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  on_sale_at: string;
}

export interface EventsResponse {
  events: Event[];
}
