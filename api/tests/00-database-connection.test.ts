import { describe, it, expect } from "vitest";
import { pool } from "@/db/pool";

describe("Test Database Connection", () => {
  it("should connect to seatrush_test database", async () => {
    const result = await pool.query<{
      database_name: string;
    }>(
      "SELECT current_database() AS database_name"
    );

    const databaseName = result.rows[0].database_name;

    console.log("Connected database:", databaseName);

    expect(databaseName).toBe("seatrush_test");
  });
});
