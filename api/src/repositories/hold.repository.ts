import type { PoolClient } from "pg";
import type { HoldRow, HoldSeatRow } from "@/types/hold.types";

export async function findSeatsForUpdate(
  client: PoolClient,
  eventId: string,
  seatIds: string[]
): Promise<HoldSeatRow[]> {
  const result = await client.query<HoldSeatRow>(
    `
    SELECT
      id,
      event_id,
      zone_id,
      row_label,
      seat_number
    FROM seats
    WHERE event_id = $1
      AND id = ANY($2::uuid[])
    ORDER BY id
    FOR UPDATE
    `,
    [eventId, seatIds]
  );

  return result.rows;
}

export async function findUnavailableSeats(
  client: PoolClient,
  eventId: string,
  seatIds: string[]
): Promise<string[]> {
  const result = await client.query<{ seat_id: string }>(
    `
    SELECT DISTINCT hs.seat_id
    FROM hold_seats hs
    JOIN holds h ON h.id = hs.hold_id
    WHERE hs.event_id = $1
      AND hs.seat_id = ANY($2::uuid[])
      AND (
        h.status = 'COMPLETED'
        OR (
          h.status = 'ACTIVE'
          AND h.expires_at > NOW()
        )
        OR EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.hold_id = h.id
        )
      )
    `,
    [eventId, seatIds]
  );

  return result.rows.map((row) => row.seat_id);
}

export async function countFanReservedSeats(
  client: PoolClient,
  eventId: string,
  fanId: string
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `
    SELECT COUNT(DISTINCT hs.seat_id) AS count
    FROM hold_seats hs
    JOIN holds h ON h.id = hs.hold_id
    WHERE h.event_id = $1
      AND h.fan_id = $2
      AND (
        h.status = 'COMPLETED'
        OR (
          h.status = 'ACTIVE'
          AND h.expires_at > NOW()
        )
        OR EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.hold_id = h.id
        )
      )
    `,
    [eventId, fanId]
  );

  return Number(result.rows[0].count);
}

export async function insertHold(
  client: PoolClient,
  eventId: string,
  fanId: string,
  ttlSeconds: number
): Promise<HoldRow> {
  const result = await client.query<HoldRow>(
    `
    INSERT INTO holds (
      event_id,
      fan_id,
      status,
      expires_at
    )
    VALUES (
      $1,
      $2,
      'ACTIVE',
      NOW() + ($3 * INTERVAL '1 second')
    )
    RETURNING
      id,
      event_id,
      fan_id,
      status,
      expires_at,
      created_at
    `,
    [eventId, fanId, ttlSeconds]
  );

  return result.rows[0];
}

export async function insertHoldSeats(
  client: PoolClient,
  holdId: string,
  eventId: string,
  seatIds: string[]
): Promise<void> {
  await client.query(
    `
    INSERT INTO hold_seats (
      hold_id,
      event_id,
      seat_id
    )
    SELECT
      $1,
      $2,
      UNNEST($3::uuid[])
    `,
    [holdId, eventId, seatIds]
  );
}

export async function findHoldForUpdate(
  client: PoolClient,
  holdId: string
): Promise<HoldRow | null> {
  const result = await client.query<HoldRow>(
    `
    SELECT
      id,
      event_id,
      fan_id,
      status,
      expires_at,
      created_at
    FROM holds
    WHERE id = $1
    FOR UPDATE
    `,
    [holdId]
  );

  return result.rows[0] ?? null;
}

export async function markHoldReleased(
  client: PoolClient,
  holdId: string
): Promise<void> {
  await client.query(
    `
    UPDATE holds
    SET status = 'RELEASED'
    WHERE id = $1
      AND status = 'ACTIVE'
    `,
    [holdId]
  );
}
