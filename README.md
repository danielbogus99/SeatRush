# SeatRush

SeatRush is a full-stack ticket booking application built with React, TypeScript, Express, and PostgreSQL.

## 1. How to Run

**Requirements:** Docker and Docker Compose.

From the project root, run:

```bash
docker compose up --build
```

The command starts PostgreSQL, the API, and the frontend.

On a fresh database, the application automatically creates the database tables and a demo concert with 60 seats. The demo event is already on sale.

**Application URLs:**

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

PostgreSQL data is preserved in a Docker volume.

## 2. How to Test

Backend tests use Vitest and a separate PostgreSQL test database.

Start PostgreSQL through Docker Compose, then run:

```bash
cd api
npm install
npm run db:test:setup
npm test
```

The test suite covers:

- Seat holds and all-or-nothing reservations.
- Concurrent requests and double-selling prevention.
- Per-fan seat limits.
- Hold expiry and event sale times.
- Best-available seat selection.
- Checkout and order creation.

The last verified run completed **35 tests across 9 files**, all passing.

## 3. Environment Variables

The backend uses these environment variables:

| Variable | Description | Docker value |
|---|---|---|
| `PORT` | API listening port | `3000` |
| `DB_HOST` | PostgreSQL host | `db` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `seatrush` |
| `DB_PASSWORD` | Database password | `seatrush_dev` |
| `DB_NAME` | Database name | `seatrush` |

Docker Compose configures these variables automatically.

For local backend development, PostgreSQL is exposed on `localhost:55432`.

The test configuration uses a separate database named `seatrush_test`.

The included credentials are for local development only.

## 4. Fan Identification

Fans are identified by a unique username.

When a fan logs in through `POST /api/fans/login`, the backend creates or retrieves their fan record and returns a unique UUID.

This UUID is used to associate seat holds, checkout operations, and orders with the fan.

Seat holds and checkout requests include `fan_id`.

This is a simplified identification system for the assignment. It does not implement password-based authentication or secure identity verification.

## 5. Known Gaps

- **Authentication:** Username-based identification is not secure authentication. Production would require proper authentication and authorization.
- **Payments:** Checkout creates an order without processing a real payment.
- **Scalability:** The application has not been load-tested with production-scale traffic.
- **Background cleanup:** A scheduled cleanup process for historical expired or released holds is not implemented.
- **Monitoring:** Production logging, metrics, and alerting are not configured.
- **Security:** Development database credentials must be replaced with securely managed secrets before production deployment.

Further architectural decisions and production considerations are documented in `DECISIONS.md`.