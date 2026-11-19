import type { BestAvailableInput, BestAvailableErrorResponse } from "@/types/bestAvailable.types";
import type { CreateHoldResult } from "@/types/hold.types";

const API_BASE_URL = "http://localhost:3000/api";

export async function createBestAvailableHold(
  eventId: string,
  data: BestAvailableInput
): Promise<CreateHoldResult> {
  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/best-available`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData: BestAvailableErrorResponse = await response.json();

    throw new Error(
      errorData.error || "Failed to find best available seats"
    );
  }

  const result: CreateHoldResult = await response.json();

  return result;
}
