
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";

describe("Rule 5 - Drop Time", () => {
  let eventId = "";
  let fanId = "";
  let seatId = "";

  beforeEach(async () => {
    eventId = "";
    fanId = "";
    seatId = "";

    const db = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (db.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing to test outside seatrush_test");
    }

    const event = await pool.query<{ id: string }>(
      `
      INSERT INTO events (
        name, venue, starts_at, on_sale_at,
        row_count, seats_per_row
      )
      VALUES (
        'Drop Time Test',
        'Test Venue',
        NOW() + INTERVAL '7 days',
        NOW() + INTERVAL '1 hour',
        1, 1
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

    const seat = await pool.query<{ id: string }>(
      `
      INSERT INTO seats (
        event_id, zone_id, row_label, seat_number
      )
      VALUES ($1, $2, 'A', 1)
      RETURNING id
      `,
      [eventId, zone.rows[0].id]
    );

    seatId = seat.rows[0].id;

    const fan = await pool.query<{ id: string }>(
      `
      INSERT INTO fans (username)
      VALUES ($1)
      RETURNING id
      `,
      [`drop-time-${randomUUID()}`]
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

  it("1. Rejects holds before the sale starts", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [seatId],
      })
    ).rejects.toThrow("Event is not on sale yet");

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM holds WHERE event_id = $1",
      [eventId]
    );

    expect(Number(result.rows[0].count)).toBe(0);
  });

  it("2. Allows holds after the sale starts", async () => {
    await pool.query(
      `
      UPDATE events
      SET on_sale_at = NOW() - INTERVAL '1 hour'
      WHERE id = $1
      `,
      [eventId]
    );

    const hold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: [seatId],
    });

    expect(hold.seat_ids).toEqual([seatId]);
    expect(hold.hold_id).toBeDefined();
  });

  it("3. Allows holds when sale time is reached", async () => {
    await pool.query(
      `
      UPDATE events
      SET on_sale_at = NOW()
      WHERE id = $1
      `,
      [eventId]
    );

    const hold = await createHold(eventId, {
      fan_id: fanId,
      seat_ids: [seatId],
    });

    expect(hold.seat_ids).toEqual([seatId]);
  });
});
