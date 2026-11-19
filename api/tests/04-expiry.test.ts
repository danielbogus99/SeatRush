import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";

describe("Rule 4 - Hold Expiry", () => {
  let eventId = "";
  let fan1Id = "";
  let fan2Id = "";
  let seatIds: string[] = [];

  beforeEach(async () => {
    const db = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (db.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing to test outside seatrush_test");
    }

    eventId = "";
    fan1Id = "";
    fan2Id = "";
    seatIds = [];

    const event = await pool.query<{ id: string }>(
      `
      INSERT INTO events (
        name, venue, starts_at, on_sale_at,
        row_count, seats_per_row
      )
      VALUES (
        'Expiry Test',
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

    const zoneId = zone.rows[0].id;

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

    const fan1 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`expiry-fan-1-${randomUUID()}`]
    );

    fan1Id = fan1.rows[0].id;

    const fan2 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`expiry-fan-2-${randomUUID()}`]
    );

    fan2Id = fan2.rows[0].id;
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

    if (fan1Id) {
      await pool.query(
        "DELETE FROM fans WHERE id = $1",
        [fan1Id]
      );
    }

    if (fan2Id) {
      await pool.query(
        "DELETE FROM fans WHERE id = $1",
        [fan2Id]
      );
    }
  });

  it("1. Creates a hold that expires after 300 seconds", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0]],
    });

    const result = await pool.query<{
      remaining_seconds: number;
    }>(
      `
      SELECT EXTRACT(
        EPOCH FROM (expires_at - created_at)
      )::float AS remaining_seconds
      FROM holds
      WHERE id = $1
      `,
      [hold.hold_id]
    );

    expect(result.rows[0].remaining_seconds).toBeCloseTo(300, 0);
  });

  it("2. Makes expired seats available to another fan", async () => {
    const firstHold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0]],
    });

    // Simulate expiry without waiting 5 minutes.
    await pool.query(
      `
      UPDATE holds
      SET expires_at = NOW() - INTERVAL '1 second'
      WHERE id = $1
      `,
      [firstHold.hold_id]
    );

    const secondHold = await createHold(eventId, {
      fan_id: fan2Id,
      seat_ids: [seatIds[0]],
    });

    expect(secondHold.seat_ids).toEqual([seatIds[0]]);
    expect(secondHold.hold_id).not.toBe(firstHold.hold_id);
  });

  it("3. Does not count expired holds toward the fan limit", async () => {
    const firstHold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: seatIds.slice(0, 4),
    });

    await pool.query(
      `
      UPDATE holds
      SET expires_at = NOW() - INTERVAL '1 second'
      WHERE id = $1
      `,
      [firstHold.hold_id]
    );

    const secondHold = await createHold(eventId, {
      fan_id: fan1Id,
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
      [eventId, fan1Id]
    );

    expect(Number(result.rows[0].count)).toBe(4);
  });
});
