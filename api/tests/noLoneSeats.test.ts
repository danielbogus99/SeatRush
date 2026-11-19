import { describe, expect, it } from "vitest";
import { createsLoneSeat } from "@/utils/noLoneSeats";
import type { SeatAvailabilityRow } from "@/repositories/hold.repository";

function makeSeats(
  availability: boolean[],
  zoneId = "zone-1"
): SeatAvailabilityRow[] {
  return availability.map((available, index) => ({
    id: `seat-${index + 1}`,
    zone_id: zoneId,
    row_label: "A",
    seat_number: index + 1,
    available,
  }));
}

describe("No Lone Seats", () => {
  it("rejects a selection that creates a lone seat", () => {
    const seats = makeSeats([true, true, false, true, true, true]);

    expect(
      createsLoneSeat(seats, ["seat-5", "seat-6"])
    ).toBe(true);
  });

  it("allows a selection without a lone seat", () => {
    const seats = makeSeats([true, true, true, true, true, true]);

    expect(
      createsLoneSeat(seats, ["seat-5", "seat-6"])
    ).toBe(false);
  });

  it("allows selecting the final available seat", () => {
    const seats = makeSeats([false, false, true, false]);

    expect(
      createsLoneSeat(seats, ["seat-3"])
    ).toBe(false);
  });

  it("ignores an already isolated seat", () => {
    const seats = makeSeats([true, false, true, false, true, true]);

    expect(
      createsLoneSeat(seats, ["seat-5", "seat-6"])
    ).toBe(false);
  });

  it("does not mix different zones", () => {
    const zone1 = makeSeats([true, true, true], "zone-1");
    const zone2 = makeSeats([false, true, false], "zone-2");

    expect(
      createsLoneSeat([...zone1, ...zone2], ["seat-1"])
    ).toBe(false);
  });
});
