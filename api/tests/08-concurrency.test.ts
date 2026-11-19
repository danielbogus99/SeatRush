
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";

describe("Rule 8 - Concurrency", () => {
  let eventId = "";
  let seatIds: string[] = [];
  let fanIds: string[] = [];

  beforeEach(async () => {
    eventId = "";
    seatIds = [];
    fanIds = [];

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
        'Concurrency Test',
        'Test Venue',
        NOW() + INTERVAL '7 days',
        NOW() - INTERVAL '1 hour',
        5, 1
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
      VALUES ($1, 'Regular', 10000, 'A', 'E')
      RETURNING id
      `,
      [eventId]
    );

    // One seat per row, so no new lone seat can be created.
    const rowLabels = ["A", "B", "C", "D", "E"];

    for (const rowLabel of rowLabels) {
      const seat = await pool.query<{ id: string }>(
        `
        INSERT INTO seats (
          event_id, zone_id, row_label, seat_number
        )
        VALUES ($1, $2, $3, 1)
        RETURNING id
        `,
        [eventId, zone.rows[0].id, rowLabel]
      );

      seatIds.push(seat.rows[0].id);
    }

    // Create 50 different fans.
    for (let i = 0; i < 50; i++) {
      const fan = await pool.query<{ id: string }>(
        `
        INSERT INTO fans (username)
        VALUES ($1)
        RETURNING id
        `,
        [`concurrency-${randomUUID()}`]
      );

      fanIds.push(fan.rows[0].id);
    }
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

    for (const fanId of fanIds) {
      await pool.query(
        "DELETE FROM fans WHERE id = $1",
        [fanId]
      );
    }
  });

  it("1. Allows only one winner for 50 requests on one seat", async () => {
    const requests = fanIds.map((fanId) =>
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [seatIds[0]],
      })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(49);

    const saved = await pool.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE hs.seat_id = $1
        AND h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      `,
      [seatIds[0]]
    );

    expect(Number(saved.rows[0].count)).toBe(1);
  }, 20000);

  it("2. Allows only 4 winners for 4 different seats", async () => {
    const requests = fanIds.map((fanId, index) =>
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [seatIds[index % 4]],
      })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    expect(successful).toHaveLength(4);

    const saved = await pool.query<{
      seat_id: string;
      count: string;
    }>(
      `
      SELECT hs.seat_id, COUNT(*) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1
        AND h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      GROUP BY hs.seat_id
      `,
      [eventId]
    );

    expect(saved.rows).toHaveLength(4);

    for (const row of saved.rows) {
      expect(Number(row.count)).toBe(1);
    }
  }, 20000);

  it("3. Prevents one fan from exceeding 4 seats concurrently", async () => {
    const requests = seatIds.map((seatId) =>
      createHold(eventId, {
        fan_id: fanIds[0],
        seat_ids: [seatId],
      })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    expect(successful).toHaveLength(4);
    expect(failed).toHaveLength(1);

    // Confirm that the fifth request was rejected by the seat limit.
    const failureReasons = failed.map((result) =>
      result.status === "rejected"
        ? String(result.reason?.message ?? result.reason)
        : ""
    );

    expect(failureReasons).toEqual(["Seat limit exceeded"]);

    const saved = await pool.query<{ count: string }>(
      `
      SELECT COUNT(DISTINCT hs.seat_id) AS count
      FROM hold_seats hs
      JOIN holds h ON h.id = hs.hold_id
      WHERE h.event_id = $1
        AND h.fan_id = $2
        AND h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      `,
      [eventId, fanIds[0]]
    );

    expect(Number(saved.rows[0].count)).toBe(4);
  }, 20000);
});
