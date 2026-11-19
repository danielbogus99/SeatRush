import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { config } from "dotenv";

config({ path: ".env.test", override: true });

if (process.env.DB_NAME !== "seatrush_test") {
  throw new Error(
    "Tests must run against seatrush_test database"
  );
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
