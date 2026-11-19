
import express from "express";
import cors from "cors";
import "dotenv/config";
import swaggerUi from "swagger-ui-express";
import { pool } from "@/db/pool";
import { openApiSpec } from "@/docs/openapi";
import eventRoutes from "@/routes/event.routes";
import holdRoutes from "@/routes/hold.routes";
import orderRoutes from "@/routes/order.routes";
import bestAvailableRoutes from "@/routes/bestAvailable.routes";
import fanRoutes from "@/routes/fan.routes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Swagger / OpenAPI
app.get("/docs-json", (_req, res) => {
  res.json(openApiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/events", eventRoutes);
app.use("/api", holdRoutes);
app.use("/api", orderRoutes);
app.use("/api", bestAvailableRoutes);
app.use("/api/fans", fanRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "SeatRush API is running",
  });
});

// Database connection check
app.get("/api/db-check", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time"
    );

    res.status(200).json({
      status: "connected",
      databaseTime: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`SeatRush API running on port ${PORT}`);
});
