import type { CheckoutInput, CheckoutResult, CheckoutErrorResponse } from "@/types/order.types";

const API_BASE_URL = "http://localhost:3000/api";

export async function checkout(
  holdId: string,
  data: CheckoutInput
): Promise<CheckoutResult> {
  const response = await fetch(
    `${API_BASE_URL}/holds/${holdId}/checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData: CheckoutErrorResponse = await response.json();

    throw new Error(
      errorData.error || "Failed to complete checkout"
    );
  }

  const result: CheckoutResult = await response.json();

  return result;
}