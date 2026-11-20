export function errorMessage(
  error: unknown,
  fallback: string
): string {
  if (!(error instanceof Error)) return fallback;

  if (/single isolated seat/i.test(error.message)) {
    return "This selection would leave a single isolated seat. Please choose different seats.";
  }

  if (/promo code already used/i.test(error.message)) {
    return "This promo code has already been used.";
  }

  if (/invalid promo code|unknown promo code/i.test(error.message)) {
    return "Invalid promo code. Please try SAVE10 or WELCOME20.";
  }

  if (/409|conflict|unavailable|already held/i.test(error.message)) {
    return "These seats are no longer available. Please choose different seats.";
  }

  return error.message;
}

export function formatSaleDate(date: string): string {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatPrice(agorot: number): string {
  return `₪${(agorot / 100).toFixed(2)}`;
}
