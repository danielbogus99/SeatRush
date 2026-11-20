# SeatRush — Technical Decisions

## 1. Architecture

SeatRush uses a three-layer full-stack architecture:

- **Frontend:** React and TypeScript for event browsing, seat selection, temporary holds, promo codes, and checkout.
- **Backend:** Express and TypeScript, organized into routes, controllers, services, and repositories.
- **Database:** PostgreSQL for persistent data, transactional booking operations, and concurrency control.

### Hold Request Flow

1. The fan selects seats in the React interface.
2. The frontend sends `POST /api/events/:eventId/holds` with the fan ID and selected seat IDs.
3. The Express route passes the request to the controller.
4. The service validates the request and starts a PostgreSQL transaction.
5. The repository locks and checks the relevant database records.
6. The service validates seat availability, the per-fan seat limit, and seating rules.
7. If all validations pass, the transaction creates the hold and its seat associations.
8. The API returns the hold ID, selected seats, and expiry time.

Business rules are implemented in services, while repositories handle SQL queries.

### Frontend Architecture

The frontend separates API communication, state management, and presentation.

- **`App.tsx`:** Coordinates application navigation, selected events, and the main UI.
- **`useEventHolds.ts`:** Manages active holds, expiration, and session storage.
- **`useBooking.ts`:** Handles seat reservations, Best Available, hold release, and checkout.
- **API modules:** Encapsulate HTTP communication with the backend.
- **Reusable components:** Handle event listings, seating maps, booking checkout, booking confirmation, and administration.

The frontend stores active hold information in browser session storage to support navigation between events and page refreshes.

However, frontend state is not authoritative. The backend validates hold ownership, expiration, seat availability, and checkout eligibility against PostgreSQL.

## 2. Database Schema

| Table | Purpose |
|---|---|
| `events` | Event information, dates, venue, and seating dimensions |
| `zones` | Pricing zones belonging to events |
| `seats` | Individual seats and their locations |
| `fans` | Fan identification by username |
| `holds` | Temporary reservations, ownership, status, and expiry |
| `hold_seats` | Association between holds and their selected seats |
| `orders` | Completed purchases associated with holds |

PostgreSQL UUIDs are used for entity identifiers.

Foreign keys and uniqueness constraints maintain referential integrity.

Separating holds from orders allows temporary reservations to expire without treating them as completed purchases.

The database also enforces the applicable uniqueness rules for promo code usage.

## 3. Double-Selling Prevention and Expiry

Double-selling prevention is enforced by PostgreSQL, not by frontend state.

### Hold Creation

- The backend starts a database transaction.
- It locks the relevant event and fan records using `SELECT ... FOR UPDATE`.
- It locks the requested seat rows in a consistent order.
- It checks whether any requested seat belongs to a completed purchase or an active, unexpired hold.
- It verifies the maximum number of seats allowed per fan.
- It validates the No Lone Seats rule.
- It creates the hold and its seat associations only when all checks succeed.
- The transaction commits on success and rolls back on failure.

Because conflicting requests must acquire the relevant database locks, they cannot successfully reserve the same available seat simultaneously.

The implementation was tested with 50 concurrent attempts to reserve one seat, resulting in exactly one successful hold.

### Hold Expiry

- Holds expire after 300 seconds (5 minutes).
- The expiry timestamp is stored in PostgreSQL.
- A hold is considered active only while its status is `ACTIVE` and its expiry time is in the future.
- Expired holds no longer block seat availability.
- Checkout checks expiry inside its database transaction.
- Completed purchases remain unavailable for future reservations.

The frontend displays a countdown and removes expired holds from its local state.

A periodic cleanup process is not required for reservation correctness. Historical expired or released hold records may be cleaned up separately in a production environment.

## 4. Booking Rules and Assumptions

The following decisions were made where implementation details were not fully specified:

- Fan identification uses a unique username rather than passwords or authentication tokens.
- Each fan has a maximum of four held or purchased seats per event.
- A hold contains between one and four seats and succeeds entirely or fails entirely.
- Hold duration is five minutes.
- Checkout is a simulated purchase without a payment gateway.
- Ticket prices are stored as integer agorot to avoid floating-point rounding errors.
- Best Available prioritizes adjacent seats in earlier rows, closer to the row center.
- Best Available requests support an optional zone and maximum price.
- The No Lone Seats rule prevents reservations that would leave a single isolated available seat between unavailable seats or at a row boundary.
- Repeated checkout for an already completed hold returns the existing order instead of creating another purchase.
- The application includes a demo event so it can be evaluated immediately after startup.

### No Lone Seats

The No Lone Seats rule is enforced by the backend during seat reservation.

The purpose is to prevent inefficient seating arrangements where a reservation leaves a single available seat isolated from other available seats.

The rule applies to manual seat selection and must also be respected by Best Available selection.

Validation is performed against the relevant seat availability within the booking transaction to avoid relying on potentially outdated frontend information.

## 5. Promo Code Design

SeatRush supports optional promotional discounts during checkout.

| Code | Discount | Usage Rule |
|---|---|---|
| `SAVE10` | 10% | Reusable across separate orders |
| `WELCOME20` | ₪20 | Once per fan |

### Design Decisions

- Promo codes are optional.
- Only one promo code may be applied per order.
- Codes are normalized to uppercase.
- Discount calculations are performed by the backend.
- All monetary calculations use integer agorot.
- Percentage discounts use half-up rounding.
- Discounts are capped at the order subtotal, so the final amount cannot become negative.
- `WELCOME20` can only be redeemed once per fan.
- The once-per-fan restriction is enforced by a PostgreSQL uniqueness constraint.
- Repeated checkout for a completed hold remains idempotent and does not create a second order.

### Why Enforce Promo Rules in the Backend?

Frontend validation improves usability but cannot guarantee correctness.

A client could send requests directly to the API, bypassing the React interface.

Therefore, the backend is responsible for validating promo codes, calculating discounts, and enforcing usage restrictions.

Database-level uniqueness protects the once-per-fan rule even when concurrent checkout requests are made.

## 6. Stack and Libraries

| Technology | Reason |
|---|---|
| React + TypeScript | Typed, component-based frontend |
| Vite | Fast frontend development and production builds |
| Material UI | Reusable interface components |
| Node.js + Express | Lightweight REST API |
| PostgreSQL | ACID transactions, row-level locking, and relational constraints |
| `pg` | Direct PostgreSQL access and transaction control |
| Docker Compose | Reproducible local environment |
| Nginx | Serves the built frontend and proxies API requests |
| Vitest | Automated tests, including concurrency scenarios |
| Swagger UI + OpenAPI | Interactive API documentation |

The backend separates controllers, services, and repositories to keep HTTP handling, business rules, and database access maintainable.

## 7. Improvements Before Production

Before a real launch, I would:

- Implement secure authentication and authorization.
- Integrate a real payment provider with reliable payment confirmation.
- Add rate limiting, request throttling, and bot protection.
- Introduce a scheduled cleanup job for historical expired and released holds.
- Add structured logging, monitoring, metrics, and alerts.
- Run large-scale load tests and optimize database connection pooling.
- Secure credentials and configure production deployment infrastructure.

## 8. Scaling Questions

### What breaks first if 100,000 fans arrive in the first minute?

The likely first bottlenecks are API throughput, PostgreSQL connection capacity, and database lock contention on popular events and seats.

The application would need load balancing, controlled database connection pooling, rate limiting, and potentially a virtual waiting room.

Correctness should remain more important than accepting every request immediately.

### Does double-selling protection still work with three API copies?

**Yes**, provided all three API instances use the same PostgreSQL database and the same transactional locking logic.

PostgreSQL row locks are shared across database connections, including connections from different API instances.

Therefore, concurrent requests from different API copies still coordinate through the database rather than relying on process-local memory.