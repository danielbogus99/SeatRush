import type { Request, Response } from "express";
import { loginFan } from "@/services/fan.service";
import type { LoginFanInput } from "@/types/fan.types";

export async function loginFanController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const input: LoginFanInput = req.body;

    const fan = await loginFan(input?.username);

    res.status(200).json({
      id: fan.id,
      username: fan.username,
      created_at: fan.created_at,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    if (
      message === "Username is required" ||
      message === "Username must be at most 100 characters" ||
      message === "Username can only contain letters, numbers, underscores and hyphens"
    ) {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Fan Login Error:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
