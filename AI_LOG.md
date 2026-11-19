# AI Usage Log

**Tool used:** ChatGPT (OpenAI)

I used ChatGPT extensively for architecture, code generation, debugging, testing, Docker setup, and documentation.

### Examples of AI Suggestions

**1. Checked — Concurrency**

AI helped implement PostgreSQL transactions and locking. I verified the solution with 50 concurrent requests for the same seat. Only one succeeded.

**2. Changed — Code Structure**

During development, I reorganized the backend into separate routes, controllers, services, and repositories to improve readability and maintainability.

**3. Changed — Docker Configuration**

I adjusted the database connection settings and ports during debugging, then verified the application using a fresh Docker environment.

**4. Rejected — Optional Improvements**

I decided not to implement additional Swagger schema refinements after confirming the documentation worked correctly.

**5. Postponed — Cleanup Job**

I postponed the periodic cleanup job to prioritize required functionality and testing. Hold expiry is already enforced by the booking logic.

### Summary

AI contributed significantly to the implementation, but I also modified suggestions, rejected optional changes, and verified important behavior through tests and manual checks.