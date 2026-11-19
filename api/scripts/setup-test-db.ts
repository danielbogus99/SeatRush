
import { config } from "dotenv";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const { Client } = pg;

config({ path: ".env.test", override: true });

const TEST_DB_NAME = "seatrush_test";

async function setupTestDatabase(): Promise<void> {
  if (process.env.DB_NAME !== TEST_DB_NAME) {
    throw new Error("DB_NAME must be seatrush_test");
  }

  const connection = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  const adminClient = new Client({
    ...connection,
    database: "postgres",
  });

  try {
    await adminClient.connect();

    const existing = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DB_NAME]
    );

    if (existing.rowCount === 0) {
      await adminClient.query(
        `CREATE DATABASE "${TEST_DB_NAME}"`
      );

      console.log("Test database created");
    } else {
      console.log("Test database already exists");
    }
  } finally {
    await adminClient.end();
  }

  const testClient = new Client({
    ...connection,
    database: TEST_DB_NAME,
  });

  try {
    await testClient.connect();

    const schemaPath = fileURLToPath(
      new URL("../sql/001_init.sql", import.meta.url)
    );

    const schema = await readFile(schemaPath, "utf8");

    await testClient.query(schema);

    console.log("Test database schema initialized");
  } finally {
    await testClient.end();
  }
}

setupTestDatabase().catch((error: unknown) => {
  console.error("Test database setup failed:", error);
  process.exitCode = 1;
});
