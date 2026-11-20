# SeatRush

SeatRush is a full-stack ticket booking application built with **React, TypeScript, Express, and PostgreSQL**.

The application allows fans to browse events, select seats, temporarily reserve them, and complete bookings. It also provides an admin interface for creating events and configuring seating layouts and pricing zones.

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

## 2. Features

### Fan Features

- **Event browsing:** View available events, venues, event dates, and ticket sale times.
- **Interactive seat selection:** View seat availability and select up to four seats per fan per event, subject to the booking rules.
- **Temporary seat holds:** Reserve selected seats for a limited time before checkout.
- **Multiple event holds:** Maintain active holds across different events and return to them while they remain valid.
- **Hold countdown:** View the remaining time before a hold expires.
- **Best Available:** Automatically find available seats according to the requested criteria.
- **Booking checkout:** Convert a valid hold into a confirmed order.
- **Promo codes:** Apply an optional discount code during checkout.
- **My Tickets:** View previously completed bookings.

### Admin Features

- Create new events.
- Configure event dates, venues, and ticket sale start times.
- Define the seating layout using rows and seats per row.
- Configure pricing zones with different ticket prices.
- View existing events.

### Booking Rules

- Seat holds are temporary and expire automatically.
- Seat reservations are processed atomically to prevent partial reservations.
- Concurrent booking requests are handled to prevent double-selling.
- A fan may book a maximum of four seats per event across completed orders and active holds.
- The system enforces the No Lone Seats rule to prevent leaving isolated available seats.
- Checkout requires a valid active hold.
- Completed bookings are stored in PostgreSQL.

## 3. Promo Codes

SeatRush supports optional promo codes during checkout.

| Promo Code | Discount | Usage Rule |
|---|---|---|
| `SAVE10` | 10% off | Reusable across separate orders |
| `WELCOME20` | ₪20 off | Once per fan |

**Promo code rules:**

- Only one promo code can be applied per order.
- Promo codes are case-insensitive.
- Discounts are calculated in integer agorot to avoid floating-point inaccuracies.
- The final order total cannot be negative.
- Reusing `WELCOME20` for the same fan is rejected.
- Promo code validation and discount calculations are performed by the backend.

## 4. How to Test

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

The previously verified test run completed **35 tests across 9 files**, all passing.

The frontend has also been manually tested for event creation, seat selection, multiple holds, hold release, checkout, promo codes, and ticket viewing.

## 5. Environment Variables

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

## 6. Fan Identification

Fans are identified by a unique username.

When a fan logs in through `POST /api/fans/login`, the backend creates or retrieves their fan record and returns a unique UUID.

This UUID is used to associate seat holds, checkout operations, promo code usage, and orders with the fan.

Seat holds and checkout requests include `fan_id`.

This is a simplified identification system for the assignment. It does not implement password-based authentication or secure identity verification.

## 7. Frontend Architecture

The frontend uses React with TypeScript and separates responsibilities across reusable components, API modules, and custom hooks.

Key responsibilities include:

- **`App.tsx`:** Application navigation and coordination between views.
- **`useEventHolds.ts`:** Active hold management, browser session persistence, and expiration handling.
- **`useBooking.ts`:** Hold creation, Best Available, release operations, and checkout.
- **API modules:** Communication with the Express backend.
- **Reusable components:** Event listings, seat maps, booking checkout, booking confirmation, and admin interfaces.

The frontend maintains active hold information in browser session storage. PostgreSQL remains the authoritative source for reservation validity and seat availability.

## 8. Bonus Features (+5)

In addition to the core booking requirements, SeatRush includes several bonus features.

### Admin Event Creation

An admin interface allows new events to be created directly from the application.

Administrators can:

- Configure event names, venues, and dates.
- Set ticket sale start times.
- Define seating layouts with configurable rows and seats per row.
- Create pricing zones with different ticket prices.
- Validate that pricing zones cover the seating layout without gaps or overlaps.

### Live Seat Availability

The application automatically refreshes seat availability every **5 seconds** while viewing an event.

This allows fans to see changes caused by other users' reservations without manually refreshing the page.

The implementation uses periodic API polling rather than WebSockets.

PostgreSQL remains the authoritative source of seat availability.

### Promo Code System

A custom discount system was implemented as an additional feature.

- `SAVE10` provides a reusable 10% discount.
- `WELCOME20` provides a ₪20 discount once per fan.
- Only one promo code can be applied per order.
- Discount validation and calculations are performed by the backend.
- Once-per-fan redemption is enforced at the database level.
- Monetary calculations use integer agorot to avoid floating-point inaccuracies.

### Concurrency Testing

The backend includes a concurrency test that sends **50 simultaneous reservation attempts** for the same seat.

The verified result was exactly one successful hold, demonstrating that the transactional locking mechanism prevents double-selling under this test scenario.

This is a targeted concurrency correctness test, not a production-scale load test.

## 9. Known Gaps

- **Authentication:** Username-based identification is not secure authentication. Production would require proper authentication and authorization.
- **Payments:** Checkout creates an order without processing a real payment.
- **Scalability:** The application has not been load-tested with production-scale traffic.
- **Background cleanup:** A scheduled cleanup process for historical expired or released holds is not implemented.
- **Monitoring:** Production logging, metrics, and alerting are not configured.
- **Security:** Development database credentials must be replaced with securely managed secrets before production deployment.

Further architectural decisions and production considerations are documented in `DECISIONS.md`.