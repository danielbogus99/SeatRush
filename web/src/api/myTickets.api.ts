import type { MyTicket } from "@/types/myTickets.types";

const API_BASE_URL = "http://localhost:3000/api";

export async function getMyTickets(
  fanId: string
): Promise<MyTicket[]> {
  const response = await fetch(
    `${API_BASE_URL}/fans/${encodeURIComponent(fanId)}/orders`
  );

  if (!response.ok) {
    const errorData: { error?: string } = await response.json();

    throw new Error(
      errorData.error || "Failed to load tickets"
    );
  }

  const result: MyTicket[] = await response.json();

  return result;
}
