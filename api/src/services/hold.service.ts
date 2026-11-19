import { pool } from "@/db/pool";
import type { PoolClient } from "pg";
import { findSeatsForUpdate, findUnavailableSeats, countFanReservedSeats, insertHold, insertHoldSeats, findHoldForUpdate, markHoldReleased } from "@/repositories/hold.repository";
import type { CreateHoldInput, CreateHoldResult } from "@/types/hold.types";

const HOLD_TTL_SECONDS = Number(process.env.HOLD_TTL_SECONDS ?? 300);
const MAX_SEATS_PER_FAN = Number(process.env.MAX_SEATS_PER_USER ?? 4);


export async function createHold(
  eventId: string,
  data: CreateHoldInput
): Promise<CreateHoldResult> {
  if (
    !data ||
    typeof data.fan_id !== "string" ||
    !Array.isArray(data.seat_ids) ||
    data.seat_ids.length < 1 ||
    data.seat_ids.length > 4 ||
    data.seat_ids.some((id) => typeof id !== "string")
  ) {
    throw new Error("Invalid hold information");
  }

  const seatIds = data.seat_ids;

  if (new Set(seatIds).size !== seatIds.length) {
    throw new Error("Duplicate seats are not allowed");
  }

  if (
    !isValidUUID(eventId) ||
    !isValidUUID(data.fan_id) ||
    seatIds.some((id) => !isValidUUID(id))
  ) {
    throw new Error("Invalid UUID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await createHoldInTransaction(
      client,
      eventId,
      data
    );

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createHoldInTransaction(
  client: PoolClient,
  eventId: string,
  data: CreateHoldInput
): Promise<CreateHoldResult> {
  const seatIds = data.seat_ids;

  const eventLock = await client.query(
    "SELECT id FROM events WHERE id = $1 FOR UPDATE",
    [eventId]
  );

  if (eventLock.rowCount !== 1) {
    throw new Error("Event not found");
  }

  const fanResult = await client.query(
    "SELECT id FROM fans WHERE id = $1 FOR UPDATE",
    [data.fan_id]
  );

  if (fanResult.rowCount !== 1) {
    throw new Error("Fan not found");
  }

  // Check event sale date
  const eventResult = await client.query<{ on_sale_at: Date }>(
    "SELECT on_sale_at FROM events WHERE id = $1",
    [eventId]
  );

  if (eventResult.rowCount !== 1) {
    throw new Error("Event not found");
  }

  if (new Date(eventResult.rows[0].on_sale_at) > new Date()) {
    throw new Error("Event is not on sale yet");
  }

  const seats = await findSeatsForUpdate(
    client,
    eventId,
    seatIds
  );

  if (seats.length !== seatIds.length) {
    throw new Error("One or more seats were not found");
  }

  const unavailableSeats = await findUnavailableSeats(
    client,
    eventId,
    seatIds
  );

  if (unavailableSeats.length > 0) {
    throw new Error("One or more seats are unavailable");
  }

  const existingCount = await countFanReservedSeats(
    client,
    eventId,
    data.fan_id
  );

  if (existingCount + seatIds.length > MAX_SEATS_PER_FAN) {
    throw new Error("Seat limit exceeded");
  }

  const hold = await insertHold(
    client,
    eventId,
    data.fan_id,
    HOLD_TTL_SECONDS
  );

  await insertHoldSeats(
    client,
    hold.id,
    eventId,
    seatIds
  );

  return {
    hold_id: hold.id,
    event_id: eventId,
    fan_id: data.fan_id,
    seat_ids: seatIds,
    expires_at: hold.expires_at,
  };
}

export async function releaseHold(
  holdId: string,
  fanId: string
): Promise<void> {
  if (!isValidUUID(holdId) || !isValidUUID(fanId)) {
    throw new Error("Invalid UUID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hold = await findHoldForUpdate(client, holdId);

    if (!hold) {
      throw new Error("Hold not found");
    }

    if (hold.fan_id !== fanId) {
      throw new Error("You do not own this hold");
    }

    if (hold.status === "COMPLETED") {
      throw new Error("Completed hold cannot be released");
    }

    if (hold.status === "RELEASED") {
      throw new Error("Hold already released");
    }

    await markHoldReleased(client, holdId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
