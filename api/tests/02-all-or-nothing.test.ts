
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";

describe("Rule 2 - All or Nothing", () => {
  let eventId: string;
  let fan1Id: string;
  let fan2Id: string;
  let seatIds: string[] = [];

  beforeAll(async () => {
    const database = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (database.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing to test against a non-test database");
    }

    const event = await pool.query<{ id: string }>(
      `
      INSERT INTO events (
        name, venue, starts_at, on_sale_at,
        row_count, seats_per_row
      )
      VALUES (
        'All or Nothing Test',
        'Test Venue',
        NOW() + INTERVAL '7 days',
        NOW() - INTERVAL '1 hour',
        1, 6
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

    for (let number = 1; number <= 6; number++) {
      const seat = await pool.query<{ id: string }>(
        `
        INSERT INTO seats (
          event_id, zone_id, row_label, seat_number
        )
        VALUES ($1, $2, 'A', $3)
        RETURNING id
        `,
        [eventId, zone.rows[0].id, number]
      );

      seatIds.push(seat.rows[0].id);
    }

    const fan1 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`test-fan-1-${randomUUID()}`]
    );

    const fan2 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`test-fan-2-${randomUUID()}`]
    );

    fan1Id = fan1.rows[0].id;
    fan2Id = fan2.rows[0].id;

    // Fan 1 reserves A1 and A2.
    // This leaves A3-A6 available together.
    await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });
  });

  it("1. Rejects a request containing an occupied seat", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fan2Id,
        seat_ids: [seatIds[1], seatIds[2], seatIds[3]],
      })
    ).rejects.toThrow("One or more seats are unavailable");
  });

  it("2. Does not create a partial hold", async () => {
    const result = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1 AND h.fan_id = $2
      `,
      [eventId, fan2Id]
    );

    expect(Number(result.rows[0].count)).toBe(0);
  });

  it("3. Reserves all seats when available", async () => {
    const result = await createHold(eventId, {
      fan_id: fan2Id,
      seat_ids: [seatIds[2], seatIds[3]],
    });

    const saved = await pool.query<{ seat_id: string }>(
      "SELECT seat_id FROM hold_seats WHERE hold_id = $1",
      [result.hold_id]
    );

    expect(saved.rows.map((row) => row.seat_id).sort()).toEqual(
      [seatIds[2], seatIds[3]].sort()
    );
  });

  afterAll(async () => {
    if (!eventId) return;

    const database = await pool.query<{ name: string }>(
      "SELECT current_database() AS name"
    );

    if (database.rows[0].name !== "seatrush_test") {
      throw new Error("Refusing cleanup outside test database");
    }

    await pool.query(
      "DELETE FROM orders WHERE hold_id IN (SELECT id FROM holds WHERE event_id = $1)",
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
});
