import { pool } from "@/db/pool";
import { findAllEvents, findEventById, findEventSeats, insertEvent, insertZone, insertSeat } from "@/repositories/event.repository";
import type { CreateEventInput, EventRow, EventDetails } from "@/types/event.types";


function getRowLabel(index: number): string {
  let number = index + 1;
  let label = "";

  while (number > 0) {
    number--;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }

  return label;
}

export async function getAllEvents(): Promise<EventRow[]> {
  const events = await findAllEvents();
  return events;

}

export async function getEventDetails(
  eventId: string
): Promise<EventDetails | null> {
  const event = await findEventById(eventId);

  if (!event) {
    return null;
  }

  const seats = await findEventSeats(eventId);

  return {
    event,
    seats,
  };
}

export async function createEvent(
  data: CreateEventInput
): Promise<string> {
  if (
    !data.name?.trim() ||
    !data.venue?.trim() ||
    !Number.isInteger(data.row_count) ||
    data.row_count <= 0 ||
    !Number.isInteger(data.seats_per_row) ||
    data.seats_per_row <= 0
  ) {
    throw new Error("Invalid event information");
  }

  const startsAt = new Date(data.starts_at);
  const onSaleAt = new Date(data.on_sale_at);

  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(onSaleAt.getTime()) ||
    onSaleAt >= startsAt
  ) {
    throw new Error("Invalid event dates");
  }

  const zoneForRow = new Map<string, number>();

  if (!Array.isArray(data.zones) || data.zones.length === 0) {
    throw new Error("At least one zone is required");
  }

  const zoneNames = new Set<string>();

  data.zones.forEach((zone, zoneIndex) => {
    if (
      typeof zone.name !== "string" ||
      !zone.name.trim() ||
      zoneNames.has(zone.name.trim()) ||
      !Number.isInteger(zone.price_agorot) ||
      zone.price_agorot < 0
    ) {
      throw new Error("Invalid price zone");
    }

    zoneNames.add(zone.name.trim());

    const start = zone.start_row;
    const end = zone.end_row;

    const rows = Array.from(
      { length: data.row_count },
      (_, index) => getRowLabel(index)
    );

    const startIndex = rows.indexOf(start);
    const endIndex = rows.indexOf(end);

    if (startIndex < 0 || endIndex < startIndex) {
      throw new Error("Invalid zone row range");
    }

    for (let row = startIndex; row <= endIndex; row++) {
      const label = rows[row];

      if (zoneForRow.has(label)) {
        throw new Error("Overlapping price zones");
      }

      zoneForRow.set(label, zoneIndex);
    }
  });

  if (zoneForRow.size !== data.row_count) {
    throw new Error("Price zones must cover all rows");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventId = await insertEvent(client, data);
    const zoneIds: string[] = [];

    // Insert price zones
    for (const zone of data.zones) {
      const zoneId = await insertZone(client, eventId, zone);
      zoneIds.push(zoneId);
    }

    for (let row = 0; row < data.row_count; row++) {
      const rowLabel = getRowLabel(row);
      const zoneIndex = zoneForRow.get(rowLabel);

      if (zoneIndex === undefined) {
        throw new Error("Missing price zone");
      }

      const zoneId = zoneIds[zoneIndex];

      for (
        let seatNumber = 1;
        seatNumber <= data.seats_per_row;
        seatNumber++
      ) {
        await insertSeat(
          client,
          eventId,
          zoneId,
          rowLabel,
          seatNumber
        );
      }
    }

    await client.query("COMMIT");

    return eventId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


