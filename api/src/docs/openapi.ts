
const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const jsonResponse = (description: string, schema: object) => ({
  description,
  content: {
    "application/json": {
      schema,
    },
  },
});

const uuidParameter = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});

const requestBody = (schemaName: string) => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schemaName}` },
    },
  },
});

export const openApiSpec = {
  openapi: "3.0.3",

  info: {
    title: "SeatRush API",
    version: "1.0.0",
    description:
      "Ticket booking API with temporary seat holds, best available seating, checkout and concurrency protection.",
  },

  servers: [{ url: "/", description: "Current server" }],

  tags: [
    { name: "Health" },
    { name: "Events" },
    { name: "Fans" },
    { name: "Holds" },
    { name: "Best Available" },
    { name: "Orders" },
  ],

  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          "200": jsonResponse("API is running", {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              message: {
                type: "string",
                example: "SeatRush API is running",
              },
            },
          }),
        },
      },
    },

    "/api/db-check": {
      get: {
        tags: ["Health"],
        summary: "Check PostgreSQL connection",
        responses: {
          "200": jsonResponse("Database connected", {
            type: "object",
            properties: {
              status: { type: "string", example: "connected" },
              databaseTime: {
                type: "string",
                format: "date-time",
              },
            },
          }),
          "500": errorResponse("Database connection failed"),
        },
      },
    },

    "/api/events": {
      get: {
        tags: ["Events"],
        summary: "Get all events",
        responses: {
          "200": jsonResponse("List of events", {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: { $ref: "#/components/schemas/Event" },
              },
            },
          }),
          "500": errorResponse("Internal server error"),
        },
      },

      post: {
        tags: ["Events"],
        summary: "Create an event with price zones and seats",
        requestBody: requestBody("CreateEventInput"),
        responses: {
          "201": jsonResponse("Event created", {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Event created successfully",
              },
              event_id: { type: "string", format: "uuid" },
            },
          }),
          "400": errorResponse("Invalid event information or zones"),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event details and seat availability",
        parameters: [uuidParameter("id")],
        responses: {
          "200": jsonResponse("Event details", {
            $ref: "#/components/schemas/EventDetails",
          }),
          "404": errorResponse("Event not found"),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/fans/login": {
      post: {
        tags: ["Fans"],
        summary: "Login or create a fan by username",
        description:
          "Identifies a fan using a username. This is a demo identification flow, not password-based authentication.",
        requestBody: requestBody("LoginFanInput"),
        responses: {
          "200": jsonResponse("Fan identified", {
            $ref: "#/components/schemas/Fan",
          }),
          "400": errorResponse("Invalid username"),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/events/{eventId}/holds": {
      post: {
        tags: ["Holds"],
        summary: "Temporarily hold selected seats",
        parameters: [uuidParameter("eventId")],
        requestBody: requestBody("CreateHoldInput"),
        responses: {
          "201": jsonResponse("Hold created", {
            $ref: "#/components/schemas/HoldResult",
          }),
          "400": errorResponse("Invalid hold information"),
          "403": errorResponse("Event is not on sale yet"),
          "409": errorResponse(
            "Seats unavailable or seat limit exceeded"
          ),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/holds/{holdId}": {
      delete: {
        tags: ["Holds"],
        summary: "Release an existing hold",
        parameters: [uuidParameter("holdId")],
        requestBody: requestBody("CheckoutInput"),
        responses: {
          "200": jsonResponse("Hold released", {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Hold released successfully",
              },
            },
          }),
          "400": errorResponse("Invalid hold information"),
          "403": errorResponse("Fan does not own this hold"),
          "404": errorResponse("Hold not found"),
          "409": errorResponse(
            "Hold already released or completed"
          ),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/events/{eventId}/best-available": {
      post: {
        tags: ["Best Available"],
        summary: "Hold the best available adjacent seats",
        parameters: [uuidParameter("eventId")],
        requestBody: requestBody("BestAvailableInput"),
        responses: {
          "201": jsonResponse("Best available hold created", {
            $ref: "#/components/schemas/HoldResult",
          }),
          "400": errorResponse("Invalid request or maximum price"),
          "404": errorResponse("Event or fan not found"),
          "409": errorResponse(
            "Not enough adjacent seats, seat limit exceeded or event not on sale"
          ),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/holds/{holdId}/checkout": {
      post: {
        tags: ["Orders"],
        summary: "Checkout a held set of seats",
        parameters: [uuidParameter("holdId")],
        requestBody: requestBody("CheckoutInput"),
        responses: {
          "201": jsonResponse("Order created", {
            $ref: "#/components/schemas/Order",
          }),
          "200": jsonResponse("Existing order returned", {
            $ref: "#/components/schemas/Order",
          }),
          "400": errorResponse("Invalid checkout information"),
          "403": errorResponse("Fan does not own this hold"),
          "404": errorResponse("Hold not found"),
          "409": errorResponse("Hold inactive, expired or invalid"),
          "500": errorResponse("Internal server error"),
        },
      },
    },

    "/api/fans/{fanId}/orders": {
      get: {
        tags: ["Orders"],
        summary: "Get all tickets and orders for a fan",
        parameters: [uuidParameter("fanId")],
        responses: {
          "200": jsonResponse("Fan tickets", {
            type: "array",
            items: { $ref: "#/components/schemas/MyTicket" },
          }),
          "400": errorResponse("Invalid fan ID"),
          "500": errorResponse("Internal server error"),
        },
      },
    },
  },

  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },

      Event: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          venue: { type: "string" },
          starts_at: { type: "string", format: "date-time" },
          on_sale_at: { type: "string", format: "date-time" },
          row_count: { type: "integer" },
          seats_per_row: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },

      CreateZoneInput: {
        type: "object",
        required: [
          "name",
          "price_agorot",
          "start_row",
          "end_row",
        ],
        properties: {
          name: { type: "string", example: "VIP" },
          price_agorot: { type: "integer", example: 25000 },
          start_row: { type: "string", example: "A" },
          end_row: { type: "string", example: "B" },
        },
      },

      CreateEventInput: {
        type: "object",
        required: [
          "name",
          "venue",
          "starts_at",
          "on_sale_at",
          "row_count",
          "seats_per_row",
          "zones",
        ],
        properties: {
          name: { type: "string", example: "Rock Festival" },
          venue: { type: "string", example: "Demo Arena" },
          starts_at: { type: "string", format: "date-time" },
          on_sale_at: { type: "string", format: "date-time" },
          row_count: { type: "integer", example: 6 },
          seats_per_row: { type: "integer", example: 10 },
          zones: {
            type: "array",
            items: { $ref: "#/components/schemas/CreateZoneInput" },
          },
        },
      },

      EventSeat: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          event_id: { type: "string", format: "uuid" },
          zone_id: { type: "string", format: "uuid" },
          zone_name: { type: "string" },
          price_agorot: { type: "integer" },
          row_label: { type: "string" },
          seat_number: { type: "integer" },
          status: {
            type: "string",
            enum: ["AVAILABLE", "HELD", "SOLD"],
          },
        },
      },

      EventDetails: {
        type: "object",
        properties: {
          event: { $ref: "#/components/schemas/Event" },
          seats: {
            type: "array",
            items: { $ref: "#/components/schemas/EventSeat" },
          },
        },
      },

      LoginFanInput: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string", example: "daniel" },
        },
      },

      Fan: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },

      CreateHoldInput: {
        type: "object",
        required: ["fan_id", "seat_ids"],
        properties: {
          fan_id: { type: "string", format: "uuid" },
          seat_ids: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
        },
      },

      BestAvailableInput: {
        type: "object",
        required: ["fan_id", "quantity"],
        properties: {
          fan_id: { type: "string", format: "uuid" },
          quantity: { type: "integer", example: 2 },
          zone_id: { type: "string", format: "uuid" },
          max_price_agorot: {
            type: "integer",
            example: 25000,
          },
        },
      },

      HoldResult: {
        type: "object",
        properties: {
          hold_id: { type: "string", format: "uuid" },
          event_id: { type: "string", format: "uuid" },
          fan_id: { type: "string", format: "uuid" },
          seat_ids: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
          expires_at: { type: "string", format: "date-time" },
        },
      },

      CheckoutInput: {
        type: "object",
        required: ["fan_id"],
        properties: {
          fan_id: { type: "string", format: "uuid" },
        },
      },

      Order: {
        type: "object",
        properties: {
          order_id: { type: "string", format: "uuid" },
          hold_id: { type: "string", format: "uuid" },
          fan_id: { type: "string", format: "uuid" },
          total_agorot: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },

      MyTicket: {
        type: "object",
        properties: {
          order_id: { type: "string", format: "uuid" },
          event_id: { type: "string", format: "uuid" },
          event_name: { type: "string" },
          venue: { type: "string" },
          starts_at: { type: "string", format: "date-time" },
          total_agorot: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
          seat_ids: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
        },
      },
    },
  },
};
