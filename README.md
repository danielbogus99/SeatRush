# SeatRush

SeatRush is a full-stack ticket booking application built with **React, TypeScript, Node.js, Express, and PostgreSQL**.

Fans can browse events, select seats, reserve them temporarily, and complete bookings. The application also includes an admin interface for creating events and configuring seating layouts and pricing zones.

The system focuses on transactional consistency, concurrent reservations, and preventing double-booking.

## 1. Getting Started

**Requirements:** Docker and Docker Compose.

```bash
git clone https://github.com/danielbogus99/SeatRush.git
cd SeatRush
docker compose up --build
```

Docker automatically installs dependencies, starts PostgreSQL, initializes the database, and launches the application.

A demo concert with **60 seats** is created automatically on a fresh database. No `.env` file or manual database setup is required.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| OpenAPI JSON | http://localhost:3000/docs-json |

To stop the application:

```bash
docker compose down
```

Database data is preserved in a Docker volume.

### Port Conflicts

PostgreSQL runs on Docker's internal network and does not require an exposed host port.

If the default frontend or API ports are unavailable, override them:

**Git Bash / Linux / macOS:**

```bash
WEB_PORT=8080 API_PORT=3001 docker compose up --build
```

**Windows PowerShell:**

```powershell
$env:WEB_PORT="8080"
$env:API_PORT="3001"
docker compose up --build
```

The frontend will then be available at http://localhost:8080.

## 2. Features

### Fan Features

- Browse events and view interactive seating layouts.
- Select seats and create temporary holds with a **5-minute countdown**.
- Maintain active holds across multiple events.
- Find seats automatically using **Best Available**, based on zone and maximum price.
- Complete bookings and view purchased tickets in **My Tickets**.
- Apply optional promo codes during checkout.

### Admin Features

- Create events with configurable dates, venues, and sale times.
- Define seating layouts and pricing zones.
- Validate seating and pricing configurations.

### Booking Rules

- Maximum **4 seats per fan per event**, including active holds and completed orders.
- Atomic reservations and transactional locking prevent double-selling.
- **No Lone Seats** validation prevents leaving isolated available seats.
- Checkout requires a valid active hold and supports idempotency.
- PostgreSQL is the authoritative source for reservations and bookings.

## 3. Bonus Features

### Promo Codes

| Code | Discount | Usage |
|---|---|---|
| `SAVE10` | 10% off | Reusable |
| `WELCOME20` | ₪20 off | Once per fan |

Promo codes are case-insensitive, limited to one per order, and validated by the backend. Discounts use integer agorot, and once-per-fan redemption is enforced in PostgreSQL.

### Live Seat Availability

Seat availability refreshes automatically every **5 seconds** using API polling.

### Admin Event Creation

Events, seating layouts, and pricing zones can be configured directly through the admin interface.

### Concurrency Testing

A targeted test performs **50 simultaneous reservation attempts** for the same seat. Exactly one succeeds, demonstrating double-booking prevention in this scenario.

## 4. Testing

Backend tests use **Vitest** and a separate PostgreSQL database named `seatrush_test`.

### Backend Tests

Install Node.js and configure a dedicated PostgreSQL test database.

Create `api/.env.test` with the appropriate connection details:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=seatrush
DB_PASSWORD=seatrush_dev
DB_NAME=seatrush_test
```

Adjust the connection settings to match your local test database.

From the project root:

```bash
cd api
npm ci
npm run db:test:setup
npm test
```

**Important:** The test setup recreates database tables. Never point it at the main `seatrush` database.

**Latest verified result: 40 tests across 10 files, all passing.**

Tests cover reservations, concurrency, seat limits, hold expiration, Best Available, checkout, and promo codes.

### Frontend Verification

From the project root:

```bash
cd web
npm ci
npm run build
npm run lint
```

The frontend booking and admin workflows have also been tested manually.

## 5. Architecture & Limitations

- **Frontend:** React, TypeScript, and Nginx.
- **Backend:** Node.js, Express, and REST APIs.
- **Database:** PostgreSQL with transactional reservation handling.
- **Deployment:** Docker Compose.
- **State:** Active holds are tracked in browser session storage, while PostgreSQL determines their actual validity.

### Known Limitations

- Username-based fan identification is simplified and does not provide secure authentication.
- Checkout does not process real payments.
- Production-scale load testing, monitoring, and background cleanup of historical holds are not implemented.
- Included database credentials are intended for local development only.

For further details, see:

- [DECISIONS.md](DECISIONS.md) — Architecture, design decisions, and tradeoffs.
- [AI_LOG.md](AI_LOG.md) — AI-assisted development documentation.