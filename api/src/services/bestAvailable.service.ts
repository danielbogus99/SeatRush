import { pool } from "@/db/pool";
import { findAvailableSeats } from "@/repositories/bestAvailable.repository";
import type { BestAvailableInput, BestAvailableResult, BestAvailableSeatRow } from "@/types/bestAvailable.types";
import { createHoldInTransaction } from "@/services/hold.service";
import type { CreateHoldResult } from "@/types/hold.types";

export function selectBestSeats(
  availableSeats: BestAvailableSeatRow[],
  quantity: number
): BestAvailableSeatRow[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
    throw new Error("Quantity must be between 1 and 4");
  }

  const rows = new Map<string, BestAvailableSeatRow[]>();

  for (const seat of availableSeats) {
    const key = `${seat.zone_id}:${seat.row_label}`;

    if (!rows.has(key)) {
      rows.set(key, []);
    }

    rows.get(key)!.push(seat);
  }

  const candidates: {
    seats: BestAvailableSeatRow[];
    rowLabel: string;
    centerDistance: number;
    startSeat: number;
  }[] = [];

  for (const rowSeats of rows.values()) {
    rowSeats.sort((a, b) => a.seat_number - b.seat_number);

    const rowLabel = rowSeats[0].row_label;

    const rowCenter = Number(rowSeats[0].row_center);

    for (let i = 0; i <= rowSeats.length - quantity; i++) {
      const group = rowSeats.slice(i, i + quantity);

      const consecutive = group.every(
        (seat, index) =>
          index === 0 ||
          seat.seat_number === group[index - 1].seat_number + 1
      );

      if (!consecutive) {
        continue;
      }

      const groupCenter =
        (group[0].seat_number + group[group.length - 1].seat_number) / 2;

      candidates.push({
        seats: group,
        rowLabel,
        centerDistance: Math.abs(groupCenter - rowCenter),
        startSeat: group[0].seat_number,
      });
    }
  }

  candidates.sort((a, b) => {
    const rowComparison = a.rowLabel.localeCompare(
      b.rowLabel,
      undefined,
      { numeric: true }
    );

    if (rowComparison !== 0) {
      return rowComparison;
    }

    if (a.centerDistance !== b.centerDistance) {
      return a.centerDistance - b.centerDistance;
    }

    return a.startSeat - b.startSeat;
  });

  return candidates[0]?.seats ?? [];
}

export async function findBestAvailableSeats(
  eventId: string,
  input: BestAvailableInput
): Promise<BestAvailableResult> {
  if (
    !input ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 4
  ) {
    throw new Error("Quantity must be between 1 and 4");
  }

  const client = await pool.connect();

  try {
    const availableSeats = await findAvailableSeats(
      client,
      eventId,
      input.zone_id,
      input.max_price_agorot
    );

    const selectedSeats = selectBestSeats(
      availableSeats,
      input.quantity
    );

    if (selectedSeats.length !== input.quantity) {
      throw new Error("Not enough adjacent seats available");
    }

    return {
      seat_ids: selectedSeats.map((seat) => seat.id),
    };
  } finally {
    client.release();
  }
}

export async function createBestAvailableHold(
  eventId: string,
  input: BestAvailableInput
): Promise<CreateHoldResult> {
  if (
    !input ||
    typeof input.fan_id !== "string" ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 4
  ) {
    throw new Error("Invalid best available information");
  }

  const isValidUUID = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  if (
    !isValidUUID(eventId) ||
    !isValidUUID(input.fan_id) ||
    (input.zone_id !== undefined && !isValidUUID(input.zone_id))
  ) {
    throw new Error("Invalid UUID");
  }

  if (
    input.max_price_agorot !== undefined &&
    (!Number.isInteger(input.max_price_agorot) ||
      input.max_price_agorot < 0)
  ) {
    throw new Error("Invalid maximum price");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventLock = await client.query(
      "SELECT id FROM events WHERE id = $1 FOR UPDATE",
      [eventId]
    );

    if (eventLock.rowCount !== 1) {
      throw new Error("Event not found");
    }

    const availableSeats = await findAvailableSeats(
      client,
      eventId,
      input.zone_id,
      input.max_price_agorot
    );

    const selectedSeats = selectBestSeats(
      availableSeats,
      input.quantity
    );

    if (selectedSeats.length !== input.quantity) {
      throw new Error("Not enough adjacent seats available");
    }

    const result = await createHoldInTransaction(
      client,
      eventId,
      {
        fan_id: input.fan_id,
        seat_ids: selectedSeats.map((seat) => seat.id),
      }
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

