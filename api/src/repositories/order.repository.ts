import type { PoolClient } from "pg";
import type { OrderRow, MyTicketRow, PromoCode } from "@/types/order.types";

export async function findOrderByHoldId(
  client: PoolClient,
  holdId: string
): Promise<OrderRow | null> {
  const result = await client.query<OrderRow>(
    `
    SELECT
      id,
      hold_id,
      fan_id,
      subtotal_agorot,
      promo_code,
      discount_agorot,
      total_agorot,
      created_at
    FROM orders
    WHERE hold_id = $1
    `,
    [holdId]
  );

  return result.rows[0] ?? null;
}

export async function calculateHoldTotal(
  client: PoolClient,
  holdId: string
): Promise<number> {
  const result = await client.query<{ total: string }>(
    `
    SELECT COALESCE(SUM(z.price_agorot), 0) AS total
    FROM hold_seats hs
    JOIN seats s ON s.id = hs.seat_id
    JOIN zones z ON z.id = s.zone_id
    WHERE hs.hold_id = $1
    `,
    [holdId]
  );

  return Number(result.rows[0].total);
}

export async function hasUsedWelcome20(
  client: PoolClient,
  fanId: string
): Promise<boolean> {
  const result = await client.query(
    `
    SELECT 1
    FROM orders
    WHERE fan_id = $1
      AND promo_code = 'WELCOME20'
    LIMIT 1
    `,
    [fanId]
  );

  return result.rows.length > 0;
}

export async function insertOrder(
  client: PoolClient,
  holdId: string,
  fanId: string,
  subtotalAgorot: number,
  promoCode: PromoCode | null,
  discountAgorot: number
): Promise<OrderRow> {
  const totalAgorot = Math.max(0, subtotalAgorot - discountAgorot);

  const result = await client.query<OrderRow>(
    `
    INSERT INTO orders (
      hold_id,
      fan_id,
      subtotal_agorot,
      promo_code,
      discount_agorot,
      total_agorot
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      hold_id,
      fan_id,
      subtotal_agorot,
      promo_code,
      discount_agorot,
      total_agorot,
      created_at
    `,
    [
      holdId,
      fanId,
      subtotalAgorot,
      promoCode,
      discountAgorot,
      totalAgorot,
    ]
  );

  return result.rows[0];
}

export async function markHoldCompleted(
  client: PoolClient,
  holdId: string
): Promise<void> {
  const result = await client.query(
    `
    UPDATE holds
    SET status = 'COMPLETED'
    WHERE id = $1
      AND status = 'ACTIVE'
      AND expires_at > NOW()
    `,
    [holdId]
  );

  if (result.rowCount !== 1) {
    throw new Error("Hold is no longer active");
  }
}

export async function findOrdersByFanId(
  client: PoolClient,
  fanId: string
): Promise<MyTicketRow[]> {
  const result = await client.query<MyTicketRow>(
    `
    SELECT
      o.id AS order_id,
      e.id AS event_id,
      e.name AS event_name,
      e.venue,
      e.starts_at,
      o.subtotal_agorot,
      o.promo_code,
      o.discount_agorot,
      o.total_agorot,
      o.created_at,
      ARRAY_AGG(
        s.id::text
        ORDER BY s.id
      ) AS seat_ids
    FROM orders o
    JOIN holds h
      ON h.id = o.hold_id
    JOIN events e
      ON e.id = h.event_id
    JOIN hold_seats hs
      ON hs.hold_id = h.id
    JOIN seats s
      ON s.id = hs.seat_id
    WHERE o.fan_id = $1
    GROUP BY
      o.id,
      e.id
    ORDER BY o.created_at DESC
    `,
    [fanId]
  );

  return result.rows;
}
