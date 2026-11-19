
import { describe, it, expect } from "vitest";
import { createHold } from "@/services/hold.service";
import type { CreateHoldInput } from "@/types/hold.types";

describe("Hold Service - Validation", () => {
  const eventId = "11111111-1111-4111-8111-111111111111";
  const fanId = "33333333-3333-4333-8333-333333333333";

  const seat1 = "22222222-2222-4222-8222-222222222221";
  const seat2 = "22222222-2222-4222-8222-222222222222";
  const seat3 = "22222222-2222-4222-8222-222222222223";
  const seat4 = "22222222-2222-4222-8222-222222222224";
  const seat5 = "22222222-2222-4222-8222-222222222225";

  it("1. Rejects more than 4 seats", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [seat1, seat2, seat3, seat4, seat5],
      })
    ).rejects.toThrow("Invalid hold information");
  });

  it("2. Rejects empty seat list", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [],
      })
    ).rejects.toThrow("Invalid hold information");
  });

  it("3. Rejects duplicate seats", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: [seat1, seat1],
      })
    ).rejects.toThrow("Duplicate seats are not allowed");
  });

  it("4. Rejects invalid event UUID", async () => {
    await expect(
      createHold("invalid-event", {
        fan_id: fanId,
        seat_ids: [seat1],
      })
    ).rejects.toThrow("Invalid UUID");
  });

  it("5. Rejects invalid fan UUID", async () => {
    await expect(
      createHold(eventId, {
        fan_id: "invalid-fan",
        seat_ids: [seat1],
      })
    ).rejects.toThrow("Invalid UUID");
  });

  it("6. Rejects invalid seat UUID", async () => {
    await expect(
      createHold(eventId, {
        fan_id: fanId,
        seat_ids: ["invalid-seat"],
      })
    ).rejects.toThrow("Invalid UUID");
  });

  it("7. Rejects missing fan ID", async () => {
    const invalidData = {
      seat_ids: [seat1],
    } as CreateHoldInput;

    await expect(
      createHold(eventId, invalidData)
    ).rejects.toThrow("Invalid hold information");
  });

  it("8. Rejects non-string seat IDs", async () => {
    const invalidData = {
      fan_id: fanId,
      seat_ids: [seat1, 123],
    } as unknown as CreateHoldInput;

    await expect(
      createHold(eventId, invalidData)
    ).rejects.toThrow("Invalid hold information");
  });
});
