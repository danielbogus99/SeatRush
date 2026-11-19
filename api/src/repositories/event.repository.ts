
import type { PoolClient } from "pg";
import { pool } from "@/db/pool";
import type { CreateEventInput , CreateZoneInput , EventRow , EventSeatRow} from "@/types/event.types";

export async function findAllEvents(): Promise<EventRow[]> {
  const result = await pool.query<EventRow>(
    `
    SELECT
      id,
      name,
      venue,
      starts_at,
      on_sale_at,
      row_count,
      seats_per_row,
      created_at
    FROM events
    ORDER BY starts_at ASC
    `
  );

  return result.rows;
}

export async function findEventById(
  eventId: string
): Promise<EventRow | null> {
  const result = await pool.query<EventRow>(
    `
    SELECT
      id,
      name,
      venue,
      starts_at,
      on_sale_at,
      row_count,
      seats_per_row,
      created_at
    FROM events
    WHERE id = $1
    `,
    [eventId]
  );

  return result.rows[0] ?? null;
}

export async function findEventSeats(
  eventId: string
): Promise<EventSeatRow[]> {
  const result = await pool.query<EventSeatRow>(
    `
    SELECT
      s.id,
      s.event_id,
      s.zone_id,
      z.name AS zone_name,
      z.price_agorot,
      s.row_label,
      s.seat_number,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM hold_seats hs
          JOIN holds h ON h.id = hs.hold_id
          JOIN orders o ON o.hold_id = h.id
          WHERE hs.seat_id = s.id
        )
        THEN 'SOLD'

        WHEN EXISTS (
          SELECT 1
          FROM hold_seats hs
          JOIN holds h ON h.id = hs.hold_id
          WHERE hs.seat_id = s.id
            AND h.status = 'ACTIVE'
            AND h.expires_at > NOW()
        )
        THEN 'HELD'

        ELSE 'AVAILABLE'
      END AS status
    FROM seats s
    JOIN zones z ON z.id = s.zone_id
    WHERE s.event_id = $1
    ORDER BY s.row_label ASC, s.seat_number ASC
    `,
    [eventId]
  );

  return result.rows;
}

export async function insertEvent(
  client: PoolClient,
  data: CreateEventInput
): Promise<string> {
  const result = await client.query(
    `
    INSERT INTO events (
      name,
      venue,
      starts_at,
      on_sale_at,
      row_count,
      seats_per_row
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
    `,
    [
      data.name,
      data.venue,
      data.starts_at,
      data.on_sale_at,
      data.row_count,
      data.seats_per_row,
    ]
  );

  return result.rows[0].id;
}

export async function insertZone(
  client: PoolClient,
  eventId: string,
  zone: CreateZoneInput
): Promise<string> {
  const result = await client.query(
    `
    INSERT INTO zones (
      event_id,
      name,
      price_agorot,
      start_row,
      end_row
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      eventId,
      zone.name,
      zone.price_agorot,
      zone.start_row,
      zone.end_row,
    ]
  );

  return result.rows[0].id;
}

export async function insertSeat(
  client: PoolClient,
  eventId: string,
  zoneId: string,
  rowLabel: string,
  seatNumber: number
): Promise<void> {
  await client.query(
    `
    INSERT INTO seats (
      event_id,
      zone_id,
      row_label,
      seat_number
    )
    VALUES ($1, $2, $3, $4)
    `,
    [eventId, zoneId, rowLabel, seatNumber]
  );
}
