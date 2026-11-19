import type { CreateHoldInput , CreateHoldResult , ReleaseHoldInput , ReleaseHoldResult , HoldErrorResponse } from "@/types/hold.types";

const API_BASE_URL = "http://localhost:3000/api";

export async function createHold(
  eventId: string,
  data: CreateHoldInput
): Promise<CreateHoldResult> {
  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/holds`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData: HoldErrorResponse = await response.json();
    throw new Error(errorData.error || "Failed to create hold");
  }

  const result: CreateHoldResult = await response.json();

  return result;
}

export async function releaseHold(
  holdId: string,
  data: ReleaseHoldInput
): Promise<ReleaseHoldResult> {
  const response = await fetch(
    `${API_BASE_URL}/holds/${holdId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData: HoldErrorResponse = await response.json();
    throw new Error(errorData.error || "Failed to release hold");
  }

  const result: ReleaseHoldResult = await response.json();

  return result;
}
