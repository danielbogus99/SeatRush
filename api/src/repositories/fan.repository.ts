import { pool } from "@/db/pool";
import type { FanRow } from "@/types/fan.types";

export async function findOrCreateFan(
  username: string
): Promise<FanRow> {
  const result = await pool.query<FanRow>(
    `
    INSERT INTO fans (username)
    VALUES ($1)
    ON CONFLICT (username)
    DO UPDATE SET username = EXCLUDED.username
    RETURNING id, username, created_at
    `,
    [username]
  );

  return result.rows[0];
}
