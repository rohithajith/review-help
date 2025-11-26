# Review App

## Overview
This is a small full-stack web app that helps customers compose and submit authentic Google reviews for a business. After scanning a QR code or visiting the site, customers see a list of editable review templates. They may edit a template, copy the text to their clipboard, then open the business's Google Maps review page and manually paste and submit the review.

Important product constraint: the app does NOT (and must not) auto-post reviews on behalf of users. All reviews must be edited and submitted manually by the customer for authenticity and compliance.

## What changed (recent updates)

### Supabase Migration (November 2025)

**The app now uses Supabase (managed Postgres) instead of Docker-based local Postgres.**

Key changes:
- **No Docker required** - the backend connects directly to Supabase
- **Single shared database** - all businesses share one DB, isolated by `business_id` column
- **Automatic SSL** - connections to Supabase use SSL automatically
- **Simplified deployment** - just set `ADMIN_DATABASE_URL` and run the server

### Material UI Migration (November 2025)

The frontend has been completely refactored from Bootstrap/custom CSS to **Material UI (MUI)** for a modern, professional look:

- **MUI v7.3.5** with `@emotion/react` and `@emotion/styled` for styling
- **Custom theme** (`client/src/theme.js`) with green primary color (#10b981) matching brand identity
- **All components refactored**: App, TemplateList, TemplateCard, EditModal, AdminDashboard, Footer, LogsViewer, TemplateIntroModal
- **Navbar removed** - simplified UI without hamburger menu or header block
- **Business logo support** - displays logo for businesses (e.g., Myra's Fish Bar) on template page
- **Clean action buttons** - centered Edit and Copy & Review buttons with modern styling
- **Responsive Grid layout** using MUI Grid with `item xs={12} sm={6} md={4}` breakpoints

See `CHANGELOG.md` for a concise file-level change log describing recent edits.

## Features
1. Template list (fetched from backend DB)
2. Edit a template (client-side modal, saved via API)
3. Copy template text to clipboard and open Google Maps review page
4. Admin dashboard to create, edit, delete templates and manage site settings (stored in localStorage currently)

## Tech stack
- Frontend: React 19 (create-react-app) with **Material UI v7.3.5** and Emotion styling
- Backend: Node.js + Express
- Database: **Supabase (Postgres)** - managed cloud database with automatic SSL

## Quick Start with Supabase

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your database connection string from: **Project Settings > Database > Connection string (URI)**
3. URL-encode special characters in your password:
   - `&` → `%26`
   - `@` → `%40`
   - `#` → `%23`

### 2. Configure the Backend

```bash
cd backend

# Copy the example env file
cp .env.example .env

# Edit .env and set your Supabase connection string
# ADMIN_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

### 3. Start the Backend

```bash
# Install dependencies
npm install

# Start the server (tables are created automatically)
node index.js
```

You should see:
```
✓ Connected to Supabase/Postgres
✓ Database schema ready
Server is running on port 5002
```

### 4. Seed Templates for a Business

```bash
# From the repo root
ADMIN_DATABASE_URL="your_connection_string" BUSINESS_ID=1 node scripts/seedSharedTenant.js
```

### 5. Start the Frontend

```bash
cd client
npm install
npm start
```

## Deploying to GCP

### Option A: GCP Compute Engine (VM)

1. Create a VM instance (Ubuntu 22.04 recommended)
2. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Clone the repo and set up:
   ```bash
   git clone https://github.com/rohithajith/review-help.git
   cd review-help/backend
   npm install --production
   ```
4. Create `.env` with your Supabase URL:
   ```bash
   echo 'ADMIN_DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres' > .env
   echo 'NODE_ENV=production' >> .env
   echo 'PORT=5002' >> .env
   ```
5. Run with PM2 (recommended for production):
   ```bash
   npm install -g pm2
   pm2 start index.js --name review-backend
   pm2 save
   pm2 startup
   ```

### Option B: GCP Cloud Run (Containerized)

1. Build and push Docker image:
   ```bash
   # Build from repo root
   docker build -t gcr.io/YOUR_PROJECT/review-backend -f backend/Dockerfile .
   docker push gcr.io/YOUR_PROJECT/review-backend
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy review-backend \
     --image gcr.io/YOUR_PROJECT/review-backend \
     --set-env-vars "ADMIN_DATABASE_URL=postgresql://..." \
     --port 5002 \
     --allow-unauthenticated
   ```

### Frontend Deployment

Build the React app and serve as static files:
```bash
cd client
npm run build
# Serve the 'build' folder with nginx, Cloud Storage, or any static host
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | List all businesses |
| POST | `/api/businesses` | Create a new business |
| GET | `/api/:businessId/templates` | Get active templates for a business |
| POST | `/api/:businessId/templates` | Create a new template |
| PUT | `/api/:businessId/templates/:id` | Update a template |
| DELETE | `/api/:businessId/templates/:id` | Delete a template |
| POST | `/api/:businessId/templates/:id/use` | Mark template as used |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_DATABASE_URL` | Yes | Supabase Postgres connection string |
| `PORT` | No | Server port (default: 5002) |
| `NODE_ENV` | No | `production` or `development` |
| `RATE_LIMIT_MAX` | No | Max requests/minute (default: 60 in production) |
| `OPENROUTER_API_KEY` | No | For AI template regeneration |

## Local Development (Legacy Docker Setup)

If you prefer local Postgres via Docker instead of Supabase:

```bash
# Start Postgres container
docker-compose up -d

# Set local connection string
export ADMIN_DATABASE_URL=postgres://appuser:password@localhost:5433/admin_db

# Start backend
cd backend && npm run dev
```

## Troubleshooting

### "self-signed certificate" error
This is handled automatically for Supabase connections. If you still see this error, ensure your `ADMIN_DATABASE_URL` contains `supabase.co` in the hostname.

### "relation does not exist" error
The tables are created automatically on server startup. If you see this error:
1. Check your `ADMIN_DATABASE_URL` is correct
2. Restart the backend server
3. Check the Supabase SQL editor to verify tables exist

### Connection refused
1. Verify your Supabase project is active
2. Check the connection string format
3. Ensure special characters in the password are URL-encoded
 # Review App
 
 ## Overview
 This is a small full-stack web app that helps customers compose and submit authentic Google reviews for a business. After scanning a QR code or visiting the site, customers see a list of editable review templates. They may edit a template, copy the text to their clipboard, then open the business's Google Maps review page and manually paste and submit the review.
 
 Important product constraint: the app does NOT (and must not) auto-post reviews on behalf of users. All reviews must be edited and submitted manually by the customer for authenticity and compliance.
 
 ## What changed (architecture & pipeline)
 
 This repository now includes a human-only learning pipeline that rotates templates and refills a backup pool using a batched LLM call driven only by user-edited reviews. Key points:
 
 - Always 10 active templates: the app maintains exactly 10 active templates (`review_templates`) shown to users.
 - Backup pool: a second table `backup_templates` stores 10 backup templates used for rotation.
 - Human-only learning: only user-edited templates that the user confirms by clicking "Copy & Review" are archived (inserted into `archived_templates`) and considered for learning. Unedited templates are never used as training input.
 - Archive + rotate endpoint: `POST /api/:businessId/templates/:id/use` accepts `{ modifiedText }`, archives the edited text, removes the active template, promotes one from `backup_templates` into `review_templates`, and returns immediately. Rotation is tenant-scoped and transactional so the UI never observes fewer than 10 active templates.
 - Batched LLM generation: when a tenant accumulates 10 archived (edited) templates, an asynchronous generation job batches those 10 inputs and calls the OpenRouter model `meta-llama/llama-3.1-8b-instruct:free` to produce 10 new backup templates. Generated templates are validated and then atomically replace the `backup_templates` for that tenant; `archived_templates` is cleared on success.
 - Safety guards: generation includes strict validation — JSON parsing, length=10, uniqueness, and a trigram Dice similarity test that rejects any generated template that is >=85% similar to any archived input. Duplicate or too-similar outputs are rejected and will cause the job to retry (with backoff) or abort safely without modifying backups.
 - Backup-empty behavior: if a rotation finds `backup_templates` empty, the server inserts a small safe fallback template so the active pool remains at 10, and triggers an urgent background generation to refill backups.
 - Non-blocking: LLM generation runs asynchronously in the background and never blocks the user's request flow.
 
 If you want to reproduce or inspect this flow, see the Backend section below for endpoints and the `backend/services/generationService.js` implementation.
 
 ## Features
 1. Template list (fetched from backend DB)
 2. Edit a template (client-side modal) and "Copy & Review" which archives only edited templates
 3. Atomic rotation: active templates are rotated from a backup pool to ensure exactly 10 actives
 4. Async LLM-based backup refill that learns only from human-edited input (batched, tenant-scoped)
 5. Admin dashboard to create, edit, delete templates and manage site settings (stored in localStorage currently)
 
 ## Tech stack
 - Frontend: React (create-react-app)
 - Backend: Node.js + Express
 - Database: Postgres (multi-tenant) in production; local dev can use Dockerized Postgres. The code includes per-tenant DB management in `backend/tenantManager.js`.
 
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
 - Frontend (dev): http://localhost:3005  
    Note: Create React App will try `3000` and automatically pick a different
    free port if that one is in use (for example `3005` in this environment).
    Check the dev-server output for the exact `Local` URL. To force a port,
    start the client with `PORT=3002 npm start`.
 - Admin UI: http://localhost:3005/#/admin
 - Backend API: http://localhost:5002/api

## Verify after start

After running `./start-all.sh` (or starting backend and client manually), run
these quick checks to ensure the backend, proxy, and template seeding are
working as expected. Run each command from the repo root.

```bash
# backend health
curl -sS http://localhost:5002/ | sed -n '1p'

# list templates for business id 1 (direct to backend)
curl -sS http://localhost:5002/api/1/templates | jq '.'

# same API via CRA dev-server proxy (replace 3005 with the dev port printed)
curl -sS http://localhost:3005/api/1/templates | jq '.'

# list admin businesses (making sure admin registry was restored)
curl -sS http://localhost:5002/api/businesses | jq '.'

# inspect recent server/client logs persisted by the backend
tail -n 200 backend/logs/errors.log

# fetch recent logs via the backend helper endpoint
curl -sS 'http://localhost:5002/api/_client-log?lines=50' | jq '.'
```

Notes:
- If `curl` to `http://localhost:5002/` fails with connection refused or
  `EADDRINUSE`, check for docker containers or other processes holding
  port 5002 (`docker ps` and `lsof -i :5002`).
- If the CRA dev-server is running on a different port, check the port printed
  by the client start command and use that port in the proxy checks above.
 
 ## Environment
 - The client reads `REACT_APP_API_URL` from `client/.env` (defaults to `http://localhost:5002/api`). Adjust if your backend runs elsewhere.
 
 ### New env variables
 - `OPENROUTER_API_KEY` - required for the asynchronous generation pipeline to call OpenRouter. If unset, generation jobs will log an error and exit; existing backups remain unchanged.
 
 ### Notes about runtime
 - The generation service uses `fetch` and `AbortController`. On Node 18+ native `fetch` is used. On older Node versions, install `node-fetch` so the generation service can call the OpenRouter API.
 
 ## Database schema (current)
 
 This project now manages three per-tenant tables that drive the learning/rotation pipeline:
 
 review_templates (active 10)
 ```sql
 CREATE TABLE IF NOT EXISTS review_templates (
   id SERIAL PRIMARY KEY,
   text TEXT NOT NULL,
   used BOOLEAN DEFAULT false,
   created_at TIMESTAMP DEFAULT NOW()
 );
 ```
 
 backup_templates (rotation pool)
 ```sql
 CREATE TABLE IF NOT EXISTS backup_templates (
   id SERIAL PRIMARY KEY,
   text TEXT NOT NULL,
   created_at TIMESTAMP DEFAULT NOW()
 );
 ```
 
 archived_templates (stores only edited user reviews for learning)
 ```sql
 CREATE TABLE IF NOT EXISTS archived_templates (
   id SERIAL PRIMARY KEY,
   text TEXT NOT NULL,
   archived_at TIMESTAMP DEFAULT NOW()
 );
 ```
 
 Notes:
 - `review_templates` should contain exactly 10 active rows presented to users. Rotation is transactional to preserve that invariant.
 - `backup_templates` holds the next 10 templates to rotate in. The generation job replaces this table atomically when it successfully produces 10 validated templates.
 - `archived_templates` stores only user-edited templates (the only inputs used for learning). When a tenant accumulates 10 archived rows, a background job calls the LLM to generate new backups.
 
 For production a migration system (Knex/Prisma) and per-tenant `business_id` columns are recommended; the included `tenantManager` creates these tables at tenant creation time.
 
 ## Operational notes & recommendations (implemented / next steps)
 
 - Tenant-scoped triggers: archive counts and generation jobs are tenant-scoped (the backend attaches a tenant `pool` per request). This prevents cross-tenant data mixing.
 - Similarity guard: the generation pipeline includes a trigram Dice similarity check and rejects generated templates with >=85% similarity to any archived input. For production Postgres consider enabling `pg_trgm` and moving similarity checks to the DB for performance.
 - Backup-empty strategy: the controller ensures the active pool remains at 10 by inserting a safe fallback if backups are empty and scheduling urgent generation; you can change this policy to block rotation until generation completes if you prefer stricter behavior.
 - Monitoring & retries: generation uses exponential backoff and logs failures. Failed jobs do not block users; archived rows remain until a successful generation replaces backups.
 - Secrets: store `OPENROUTER_API_KEY` securely (env, Vault, etc.).
 
 Recommended next steps:
 
 1. Add a migration system (Knex/Prisma) and evolve runtime table creation into versioned migrations.
 2. Add admin debug endpoints to inspect `archived_templates` and `backup_templates` per tenant.
 3. Optionally replace the in-process generation trigger with a persistent queue (Bull/Redis) for reliability at scale.
 
 This README documents the new implemented architecture and pipeline. See `backend/services/generationService.js`, `backend/controllers/templatesController.js`, and `backend/tenantManager.js` for the implementation details.
 
 ## Contributing
 PRs and issues welcome. For non-trivial changes (DB schema, production config), please open an issue first so we can coordinate migrations and deployment plans.
 
 ## License
 This project is licensed under the ISC License.