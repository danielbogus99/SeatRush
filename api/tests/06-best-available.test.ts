
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";
import { createBestAvailableHold } from "@/services/bestAvailable.service";

describe("Rule 6 - Best Available", () => {
  let eventId = "";
  let fan1Id = "";
  let fan2Id = "";
  let seatIds: string[] = [];

  beforeEach(async () => {
    eventId = "";
    fan1Id = "";
    fan2Id = "";
    seatIds = [];

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
        'Best Available Test',
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

    for (let number = 1; number <= 8; number++) {
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
      [`best-fan-1-${randomUUID()}`]
    );

    fan1Id = fan1.rows[0].id;

    const fan2 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`best-fan-2-${randomUUID()}`]
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

  it("1. Selects adjacent seats near the center", async () => {
    const hold = await createBestAvailableHold(eventId, {
      fan_id: fan1Id,
      quantity: 2,
    });

    expect(hold.seat_ids).toEqual([
      seatIds[3],
      seatIds[4],
    ]);
  });

  it("2. Skips occupied seats", async () => {
    // Occupy A1 and A2 legally.
    await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    const hold = await createBestAvailableHold(eventId, {
      fan_id: fan2Id,
      quantity: 2,
    });

    // A3 and A4 are the best legal adjacent pair.
    expect(hold.seat_ids).toEqual([
      seatIds[2],
      seatIds[3],
    ]);
  });

  it("3. Rejects when no adjacent group exists", async () => {
    // Build a test layout with two separate one-seat rows.
    // No adjacent pair exists anywhere in this event.
    await pool.query(
      `
      DELETE FROM seats
      WHERE event_id = $1
        AND id <> ALL($2::uuid[])
      `,
      [eventId, [seatIds[0], seatIds[1]]]
    );

    await pool.query(
      `
      UPDATE seats
      SET row_label = 'B', seat_number = 1
      WHERE id = $1
      `,
      [seatIds[1]]
    );

    await pool.query(
      `
      UPDATE zones
      SET end_row = 'B'
      WHERE event_id = $1
      `,
      [eventId]
    );

    await pool.query(
      `
      UPDATE events
      SET row_count = 2, seats_per_row = 1
      WHERE id = $1
      `,
      [eventId]
    );

    await expect(
      createBestAvailableHold(eventId, {
        fan_id: fan2Id,
        quantity: 2,
      })
    ).rejects.toThrow(
      "Not enough adjacent seats available"
    );
  });

  it("4. Rejects a request for more than 4 seats", async () => {
    await expect(
      createBestAvailableHold(eventId, {
        fan_id: fan1Id,
        quantity: 5,
      })
    ).rejects.toThrow(
      "Invalid best available information"
    );
  });
});
