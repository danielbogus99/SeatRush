import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold, releaseHold } from "@/services/hold.service";

describe("Rule 3 - Per-Fan Seat Limit", () => {
  let eventId: string;
  let fanId: string;
  let zoneId: string;
  let seatIds: string[];

  beforeEach(async () => {
    const db = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (db.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing to test outside seatrush_test");
    }

    eventId = "";
    fanId = "";
    zoneId = "";
    seatIds = [];

    const event = await pool.query<{ id: string }>(
      `
      INSERT INTO events (
        name, venue, starts_at, on_sale_at,
        row_count, seats_per_row
      )
      VALUES (
        'Fan Limit Test',
        'Test Venue',
        NOW() + INTERVAL '7 days',
        NOW() - INTERVAL '1 hour',
        1, 8
      )
      RETURNING id
      `
    );

    eventId = event.rows[0].id;

    const zone = await pool.query<{ id: string }>(
      `
      INSERT INTO zones (
        event_id, name, price_agorot, start_row, end_row
      )
      VALUES ($1, 'Regular', 10000, 'A', 'A')
      RETURNING id
      `,
      [eventId]
    );

    zoneId = zone.rows[0].id;

    for (let number = 1; number <= 8; number++) {
      const seat = await pool.query<{ id: string }>(
        `
        INSERT INTO seats (
          event_id, zone_id, row_label, seat_number
        )
        VALUES ($1, $2, 'A', $3)
        RETURNING id
        `,
        [eventId, zoneId, number]
      );

      seatIds.push(seat.rows[0].id);
    }

    const fan = await pool.query<{ id: string }>(
      `
      INSERT INTO fans (username)
      VALUES ($1)
      RETURNING id
      `,
      [`limit-test-${randomUUID()}`]
    );

    fanId = fan.rows[0].id;
  });

  afterEach(async () => {
    if (!eventId) return;

    const db = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (db.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing cleanup outside seatrush_test");
    }

    await pool.query(
      `
      DELETE FROM orders
      WHERE hold_id IN (
        SELECT id FROM holds WHERE event_id = $1
      )
      `,
      [eventId]
    );

    await pool.query(
      "DELETE FROM hold_seats WHERE event_id = $1",
      [eventId]
    );

    await pool.query(
      "DELETE FROM holds WHERE event_id = $1",
      [eventId]
    );

    await pool.query(
      "DELETE FROM seats WHERE event_id = $1",
      [eventId]
    );

    await pool.query(
      "DELETE FROM zones WHERE event_id = $1",
      [eventId]
    );

    await pool.query(
      "DELETE FROM events WHERE id = $1",
      [eventId]
    );

    if (fanId) {
      await pool.query(
        "DELETE FROM fans WHERE id = $1",
        [fanId]
      );
    }
  });

  it("1. Allows a fan to hold exactly 4 seats", async () => {
    const hold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(0, 4),
    });

    expect(hold.seat_ids).toHaveLength(4);

    const result = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats
      WHERE hold_id = $1
      `,
      [hold.hold_id]
    );

    expect(Number(result.rows[0].count)).toBe(4);
  });

  it("2. Allows multiple holds up to a total of 4 seats", async () => {
    await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(0, 2),
    });

    const secondHold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(2, 4),
    });

    expect(secondHold.seat_ids).toHaveLength(2);

    const result = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1
        AND h.fan_id = $2
        AND h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      `,
      [eventId, fanId]
    );

    expect(Number(result.rows[0].count)).toBe(4);
  });

  it("3. Rejects a hold that exceeds the 4-seat limit", async () => {
    await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(0, 3),
    });

    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: seatIds.slice(3, 5),
      })
    ).rejects.toThrow("Seat limit exceeded");

    const result = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1
        AND h.fan_id = $2
      `,
      [eventId, fanId]
    );

    expect(Number(result.rows[0].count)).toBe(3);
  });

  it("4. Allows new seats after releasing a hold", async () => {
    const firstHold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(0, 4),
    });

    await releaseHold(firstHold.hold_id, fanId);

    const secondHold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: seatIds.slice(4, 8),
    });

    expect(secondHold.seat_ids).toHaveLength(4);

    const result = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1
        AND h.fan_id = $2
        AND h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      `,
      [eventId, fanId]
    );

    expect(Number(result.rows[0].count)).toBe(4);
  });
});
