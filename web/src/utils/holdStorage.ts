import type { CreateHoldResult } from "@/types/hold.types";

export type HoldsByEvent = Record<string, CreateHoldResult>;

const HOLDS_PREFIX = "seatrush_active_holds_";

function getHoldsKey(fanId: string): string {
  return `${HOLDS_PREFIX}${fanId}`;
}

function isValidHold(
  value: unknown,
  eventId: string,
  fanId: string
): value is CreateHoldResult {
  if (!value || typeof value !== "object") return false;

  const hold = value as Partial<CreateHoldResult>;

  return (
    typeof hold.hold_id === "string" &&
    hold.event_id === eventId &&
    hold.fan_id === fanId &&
    Array.isArray(hold.seat_ids) &&
    hold.seat_ids.every((id) => typeof id === "string") &&
    typeof hold.expires_at === "string" &&
    Number.isFinite(Date.parse(hold.expires_at)) &&
    Date.parse(hold.expires_at) > Date.now()
  );
}

export function loadHolds(fanId: string | null): HoldsByEvent {
  if (!fanId) return {};

  try {
    const saved = sessionStorage.getItem(getHoldsKey(fanId));
    if (!saved) return {};

    const parsed: unknown = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result: HoldsByEvent = {};

    for (const [eventId, value] of Object.entries(parsed)) {
      if (isValidHold(value, eventId, fanId)) {
        result[eventId] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function saveHolds(
  fanId: string,
  holds: HoldsByEvent
): void {
  try {
    sessionStorage.setItem(
      getHoldsKey(fanId),
      JSON.stringify(holds)
    );
  } catch (error) {
    console.error("Failed to save holds:", error);
  }
}
