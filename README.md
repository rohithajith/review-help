# Review App

## Overview
This is a small full-stack web app that helps customers compose and submit authentic Google reviews for a business. After scanning a QR code or visiting the site, customers see a list of editable review templates. They may edit a template, copy the text to their clipboard, then open the business's Google Maps review page and manually paste and submit the review.

Important product constraint: the app does NOT (and must not) auto-post reviews on behalf of users. All reviews must be edited and submitted manually by the customer for authenticity and compliance.

## What changed (recent updates)

Below are important updates present on the `testing` branch. These changes improve local developer experience, add integration-style tests (mocked), and harden the multi-tenant startup flow for local development.

- Backend: added a mocked integration test (`backend/__tests__/integration.test.js`) that validates business/template APIs, middleware, rate-limiting and centralized error handling without requiring a live Postgres instance (Jest + Supertest).
- Startup & orchestration: added `start-all.sh` to orchestrate Docker (Postgres), backend, and client for local development. The script waits for Postgres readiness, exports `ADMIN_DATABASE_URL`, and starts both servers with the correct env variables.
- Docker: updated `docker-compose.yml` in dev to map host port `5433` -> container `5432` to avoid conflicts with a local Postgres instance. If you prefer the default `5432`, stop your host Postgres before starting the compose stack.
- Backend tenancy fixes: fixed tenant creation and migration orchestration so that tenant DBs are created, migrations run, and seed templates are inserted automatically when a new business is created.
- Frontend fixes: fixed a loading bug in `client/src/hooks/useTemplates.js` that caused the UI to show "Loading templates..." indefinitely when no business was selected. The app now auto-selects the first business on load and persists it to `localStorage` so templates appear on the homepage.
- Admin UI/UX: improved `client/src/components/AdminDashboard.js` to present boxed, separated sections (Business, Templates, Branding & Links) and added CSS in `client/src/App.css` to provide consistent boxed cards and spacing.
- Demo data: seeded 10 sample templates into the demo tenant DB (visible in tenant Postgres `review_templates`) to make it easier to explore the UI.

If you want to reproduce these changes locally, follow the "How to run the full stack (dev)" section below.

## Features
1. Template list (fetched from backend DB)
2. Edit a template (client-side modal, saved via API)
3. Copy template text to clipboard and open Google Maps review page
4. Admin dashboard to create, edit, delete templates and manage site settings (stored in localStorage currently)

## Tech stack
- Frontend: React (create-react-app)
- Backend: Node.js + Express
- Database: SQLite (file: `backend/reviewapp.db`)

## Local setup and run

Prerequisites
- Node.js and npm

1) Install backend deps and start backend

```bash
cd /Users/rohith/Desktop/review-app/backend
npm install
# start dev server (nodemon) or run directly
npm run dev    # uses nodemon if available
# or
node index.js
```

2) Install client deps and start frontend

```bash
cd /Users/rohith/Desktop/review-app/client
npm install
# start react dev server (the project respects PORT from .env)
PORT=3002 BROWSER=none npm start
```

Persistence note (dev)
- The local `postgres` started via `docker-compose.yml` stores DB files in a named volume `pgdata`. This keeps your `admin_db` and tenant databases persistent across container restarts and recreates. To inspect or remove the data you can run `docker-compose down -v` to remove volumes or `docker volume ls` / `docker volume rm` for manual management.

Seeding in dev
- By default the repository provides idempotent seed scripts. Use the `SEED_TENANTS` env var to control automatic seeding when using `start-all.sh` (for example: `SEED_TENANTS=true ./start-all.sh`). Seed scripts will register tenants in the admin DB and create/seed tenant DBs if missing.

3) Seed the DB (optional — idempotent)

```bash
node /Users/rohith/Desktop/review-app/backend/seedTemplates.js
```

4) Open in browser
- Frontend: http://localhost:3002
- Admin UI: http://localhost:3002/admin
- Backend API: http://localhost:5002/api

## Environment
- The client reads `REACT_APP_API_URL` from `client/.env` (defaults to `http://localhost:5002/api`). Adjust if your backend runs elsewhere.

## Database schema (current)

review_templates
```sql
CREATE TABLE IF NOT EXISTS review_templates (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   text TEXT NOT NULL,
   used INTEGER DEFAULT 0,
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

archived_templates
```sql
CREATE TABLE IF NOT EXISTS archived_templates (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   text TEXT NOT NULL,
   archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Notes: We currently create these tables on server start (`backend/db.js`). For production it is recommended to switch to migrations (see "Next steps").

## Admin Dashboard
- URL: `/admin` on the client server (e.g. `http://localhost:3002/admin`).
- Capabilities: list templates, create template, edit template, delete single/multiple templates, manage a couple of site settings stored in browser `localStorage` (Google review link, business name, welcome message).

Usage notes
- The admin UI now calls the backend API (configured by `REACT_APP_API_URL`) and expects templates to have `id` fields (SQLite integer ids).

## Product & compliance notes
- Manual submission only: customers must manually paste and submit reviews in Google Maps. The app copies text to clipboard and opens the Google Maps review page but does not submit on their behalf.
- Privacy: the app does not collect personal user data by default. If you plan to collect or store personally identifiable information, add a privacy policy and secure storage.
- Rate limiting & abuse: for production add rate limiting, authentication for admin actions, and input validation.

## Next Steps / Multi-Tenant Readiness

### 1. Add `businessId` to templates
- Add a `businessId` field to `review_templates` (and optionally `archived_templates`) to associate templates with the correct business.  
- Update admin UI to allow selecting or creating a business when managing templates.  
- Update API and frontend fetch logic to filter templates per business.

### 2. Introduce migrations
- Replace runtime table creation with a migration tool (Knex, Prisma, or Sequelize).  
- Benefits: versioned schema updates, safer multi-tenant expansion, easier rollback.

### 3. Server-side validation and security
- Validate and sanitize all user inputs (template text, business info, etc.).  
- Add logging for API requests and admin actions.  
- Implement rate limiting for review template requests to prevent abuse.

### 4. Archive-on-use flow
- When a customer confirms submission:  
  - Insert the used template into `archived_templates`.  
  - Mark original template as `used` or remove it from the active list.  
- Keeps template list fresh and tracks historical submissions per business.

### 5. Tests and CI
- Add unit tests for backend controllers and frontend API fetches.  
- Integrate CI (GitHub Actions or similar) to run tests automatically on commits/PRs.  
- Ensures reliability as you expand multi-tenant logic.

**Priority order for implementation:** 1 → 2 → 3 → 4 → 5  
This order ensures your app can handle multiple businesses safely before refining UX and automation.

## Recommended production architecture: one Postgres server, many tenant databases

If you want per-tenant isolation while keeping a single Postgres server process, a recommended deployment is:

   - One Postgres server (one instance/cluster) that hosts multiple databases:
      - admin_db (business registry)
      - tenant1_db
      - tenant2_db
      - tenant3_db
      - tenant4_db

Why this pattern?
   - Pros:
      - Strong data isolation: each tenant has its own database file/namespace (easier backups/restore per tenant).
      - Per-tenant migrations and seeds can run independently.
      - Easier to revoke access for a single tenant without affecting others.
      - Lower management overhead than separate Postgres servers while preserving tenant separation.
   - Cons:
      - More databases to manage on a single server (monitoring/maintenance required).
      - Cross-tenant queries require an external aggregate step; not suitable if you need frequent cross-tenant joins.
      - Resource contention on the same Postgres instance is still possible; plan for resource limits and monitoring.

How this repo fits that pattern
   - The codebase already implements a per-tenant-DB approach at the application layer: the `tenantManager` handles creating tenant databases (when needed), returning a connection pool for a given tenant, and running per-tenant migrations/seeds.
   - The `admin_db` (configured via `ADMIN_DATABASE_URL`) stores businesses and a `tenant_connection` value used to connect to the tenant database for that business.
   - In short: this repo is already compatible with a single Postgres server hosting multiple tenant DBs. No code changes are required to adopt that architecture; you only need to configure your Postgres instance and environment variables correctly.

Quick configuration & run notes (local / docker)
   1. Start a Postgres server reachable from the app (docker-compose in this repo exposes container port 5432, mapped to host `5433:5432` to avoid local Postgres conflicts). In production you'll use the standard `5432` port on your DB host.
   2. Ensure `ADMIN_DATABASE_URL` points to the admin DB (example):

```bash
export ADMIN_DATABASE_URL="postgres://appuser:password@db-host:5432/admin_db"
```

   3. Start the backend (it will use `ADMIN_DATABASE_URL` to read the businesses table). When a new business is created (via the API or seed script) the backend's `tenantManager` will create the tenant database (e.g. `tenant1_db`) and run tenant migrations/seeds.

   4. Tenant connection strings stored in the `businesses` table should be full Postgres URLs, for example:

```text
postgres://appuser:password@db-host:5432/tenant1_db
```

   5. To inspect tenant DBs locally with psql (dockerized Postgres):

```bash
# connect to tenant1_db (from host)
psql "postgres://appuser:password@localhost:5433/tenant1_db"

# or inside the postgres container
docker exec -it <compose-project>_postgres_1 psql -U appuser -d tenant1_db
```

Migration recommendations
   - Use a migration tool (Knex or Prisma). Run tenant schema migrations when a tenant DB is created. The repo includes migration helpers referenced by `tenantManager` but you should centralize migrations into a tool and add a reproducible `npm run migrate:tenant <connectionString>` flow.

Operational notes
   - Backups: snapshot databases individually (pg_dump per tenant) or use a physical backup of the instance depending on needs.
   - Monitoring: track connections, locks, and per-database disk usage to detect tenant resource pressure.
   - Security: ensure each tenant DB is only accessible by the application user or a controlled set of DB users.

No code changes applied in this branch
   - Per your instruction, I did not modify application code to implement or force this architecture — I only updated this `README.md` to recommend the approach and explain how to configure it for this repo. The codebase already includes the per-tenant DB model at the application layer (`tenantManager` + business registry).


## Contributing
PRs and issues welcome. For non-trivial changes (DB schema, production config), please open an issue first so we can coordinate migrations and deployment plans.

## License
This project is licensed under the ISC License.