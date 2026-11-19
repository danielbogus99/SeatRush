import type { Fan, LoginFanInput } from "@/types/fan.types";

const API_URL = "http://localhost:3000/api";

export async function loginFan(input: LoginFanInput): Promise<Fan> {
  const response = await fetch(`${API_URL}/fans/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to login");
  }

  return data as Fan;
}
