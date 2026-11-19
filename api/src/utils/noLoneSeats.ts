
import type { SeatAvailabilityRow } from "@/repositories/hold.repository";

export function createsLoneSeat(
  seats: SeatAvailabilityRow[],
  selectedSeatIds: string[]
): boolean {
  const selectedIds = new Set(selectedSeatIds);
  const rows = new Map<string, SeatAvailabilityRow[]>();

  for (const seat of seats) {
    const key = `${seat.zone_id}:${seat.row_label}`;

    if (!rows.has(key)) {
      rows.set(key, []);
    }

    rows.get(key)!.push(seat);
  }

  for (const rowSeats of rows.values()) {
    rowSeats.sort((a, b) => a.seat_number - b.seat_number);

    for (let i = 0; i < rowSeats.length; i++) {
      const seat = rowSeats[i];

      if (!seat.available || selectedIds.has(seat.id)) {
        continue;
      }

      const left = rowSeats[i - 1];
      const right = rowSeats[i + 1];

      const isBlocked = (
        neighbor: SeatAvailabilityRow | undefined,
        expectedNumber: number,
        afterSelection: boolean
      ): boolean => {
        return (
          !neighbor ||
          neighbor.seat_number !== expectedNumber ||
          !neighbor.available ||
          (afterSelection && selectedIds.has(neighbor.id))
        );
      };

      const wasIsolated =
        isBlocked(left, seat.seat_number - 1, false) &&
        isBlocked(right, seat.seat_number + 1, false);

      const willBeIsolated =
        isBlocked(left, seat.seat_number - 1, true) &&
        isBlocked(right, seat.seat_number + 1, true);

      if (!wasIsolated && willBeIsolated) {
        return true;
      }
    }
  }

  return false;
}
