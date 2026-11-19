import { findOrCreateFan } from "@/repositories/fan.repository";
import type { LoginFanResult } from "@/types/fan.types";

export async function loginFan(username: string): Promise<LoginFanResult> {
  if (typeof username !== "string") {
    throw new Error("Username is required");
  }

  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    throw new Error("Username is required");
  }

  if (normalizedUsername.length > 100) {
    throw new Error("Username must be at most 100 characters");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
    throw new Error("Username can only contain letters, numbers, underscores and hyphens");
  }

  return await findOrCreateFan(normalizedUsername);
}
