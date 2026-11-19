
import type { PoolClient } from "pg";
import type { BestAvailableSeatRow } from "@/types/bestAvailable.types";

export async function findAvailableSeats(
  client: PoolClient,
  eventId: string,
  zoneId?: string,
  maxPriceAgorot?: number
): Promise<BestAvailableSeatRow[]> {
  const result = await client.query<BestAvailableSeatRow>(
    `
    SELECT
      s.id,
      s.event_id,
      s.zone_id,
      s.row_label,
      s.seat_number,
      z.price_agorot,
      (
        SELECT (
          MIN(all_seats.seat_number) +
          MAX(all_seats.seat_number)
        ) / 2.0
        FROM seats all_seats
        WHERE all_seats.event_id = s.event_id
          AND all_seats.zone_id = s.zone_id
          AND all_seats.row_label = s.row_label
      ) AS row_center
    FROM seats s
    JOIN zones z ON z.id = s.zone_id
    WHERE s.event_id = $1
      AND ($2::uuid IS NULL OR s.zone_id = $2::uuid)
      AND ($3::integer IS NULL OR z.price_agorot <= $3)
      AND NOT EXISTS (
        SELECT 1
        FROM hold_seats hs
        JOIN holds h ON h.id = hs.hold_id
        WHERE hs.seat_id = s.id
          AND (
            h.status = 'COMPLETED'
            OR (
              h.status = 'ACTIVE'
              AND h.expires_at > NOW()
            )
          )
      )
    ORDER BY s.row_label ASC, s.seat_number ASC
    `,
    [eventId, zoneId ?? null, maxPriceAgorot ?? null]
  );

  return result.rows;
}
