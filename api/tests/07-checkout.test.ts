
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db/pool";
import { createHold } from "@/services/hold.service";
import { checkout, getFanOrders } from "@/services/order.service";

describe("Rule 7 - Checkout", () => {
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
        'Checkout Test',
        'Test Venue',
        NOW() + INTERVAL '7 days',
        NOW() - INTERVAL '1 hour',
        1, 4
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

    for (let number = 1; number <= 4; number++) {
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
      [`checkout-fan-1-${randomUUID()}`]
    );

    fan1Id = fan1.rows[0].id;

    const fan2 = await pool.query<{ id: string }>(
      "INSERT INTO fans (username) VALUES ($1) RETURNING id",
      [`checkout-fan-2-${randomUUID()}`]
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

  it("1. Completes checkout and creates an order", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    const result = await checkout(hold.hold_id, {
      fan_id: fan1Id,
    });

    expect(result.created).toBe(true);
    expect(result.order.hold_id).toBe(hold.hold_id);
    expect(result.order.fan_id).toBe(fan1Id);
    expect(result.order.total_agorot).toBe(20000);

    const saved = await pool.query<{ status: string }>(
      "SELECT status FROM holds WHERE id = $1",
      [hold.hold_id]
    );

    expect(saved.rows[0].status).toBe("COMPLETED");
  });

  it("2. Returns the same order on repeated checkout", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    const first = await checkout(hold.hold_id, {
      fan_id: fan1Id,
    });

    const second = await checkout(hold.hold_id, {
      fan_id: fan1Id,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.order.order_id).toBe(first.order.order_id);

    const saved = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM orders WHERE hold_id = $1",
      [hold.hold_id]
    );

    expect(Number(saved.rows[0].count)).toBe(1);
  });

  it("3. Rejects checkout by another fan", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    await expect(
      checkout(hold.hold_id, {
        fan_id: fan2Id,
      })
    ).rejects.toThrow("You do not own this hold");

    const saved = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM orders WHERE hold_id = $1",
      [hold.hold_id]
    );

    expect(Number(saved.rows[0].count)).toBe(0);
  });

  it("4. Rejects checkout of an expired hold", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    await pool.query(
      `
      UPDATE holds
      SET expires_at = NOW() - INTERVAL '1 second'
      WHERE id = $1
      `,
      [hold.hold_id]
    );

    await expect(
      checkout(hold.hold_id, {
        fan_id: fan1Id,
      })
    ).rejects.toThrow("Hold has expired");

    const saved = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM orders WHERE hold_id = $1",
      [hold.hold_id]
    );

    expect(Number(saved.rows[0].count)).toBe(0);
  });

  it("5. Rejects checkout of a released hold", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    await pool.query(
      `
      UPDATE holds
      SET status = 'RELEASED'
      WHERE id = $1
      `,
      [hold.hold_id]
    );

    await expect(
      checkout(hold.hold_id, {
        fan_id: fan1Id,
      })
    ).rejects.toThrow("Hold is not active");
  });

  it("6. Shows purchased tickets in fan orders", async () => {
    const hold = await createHold(eventId, {
      fan_id: fan1Id,
      seat_ids: [seatIds[0], seatIds[1]],
    });

    const purchase = await checkout(hold.hold_id, {
      fan_id: fan1Id,
    });

    const tickets = await getFanOrders(fan1Id);

    expect(tickets).toHaveLength(1);
    expect(tickets[0].order_id).toBe(purchase.order.order_id);
    expect(tickets[0].event_id).toBe(eventId);
    expect(tickets[0].total_agorot).toBe(20000);
    expect([...tickets[0].seat_ids].sort()).toEqual(
      [seatIds[0], seatIds[1]].sort()
    );

    const otherFanTickets = await getFanOrders(fan2Id);

    expect(otherFanTickets).toHaveLength(0);
  });
});
