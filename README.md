# Review App

## Overview
This is a small full-stack web app that helps customers compose and submit authentic Google reviews for a business. After scanning a QR code or visiting the site, customers see a list of editable review templates. They may edit a template, copy the text to their clipboard, then open the business's Google Maps review page and manually paste and submit the review.

Important product constraint: the app does NOT (and must not) auto-post reviews on behalf of users. All reviews must be edited and submitted manually by the customer for authenticity and compliance.

## What changed (recent updates)
- Fixed admin UI to work with the backend SQLite schema (templates use `id`, not `_id`). Admin now uses `REACT_APP_API_URL` for API calls and refreshes the list after create/update/delete.
- Added `backend/seedTemplates.js` — a seed script that populates `review_templates` with example restaurant templates if the table is empty.
- Fixed controller SQL references so every controller uses the `review_templates` table consistently.
- Removed stray debug logs from the client.

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

## Next steps / recommended improvements
1. Add `businessId` (place id or URL fragment) to `review_templates` and surface it in the admin UI so each template can open the correct Google Maps place.
2. Implement archive-on-use flow: when a user confirms they've submitted a review, insert into `archived_templates` and mark the original as used or remove it.
3. Introduce a migration tool (knex or similar) instead of creating tables at runtime.
4. Add server-side validation, sanitization, logging, and rate limiting.
5. Add tests (controllers + client fetch) and CI (GitHub Actions).

## Contributing
PRs and issues welcome. For non-trivial changes (DB schema, production config), please open an issue first so we can coordinate migrations and deployment plans.

## License
This project is licensed under the ISC License.