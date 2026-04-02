# Cybersecurity Hardening Notes (`cyber.md`)

Last updated: 2026-04-02

This file tracks security changes applied to this app so future reviews can quickly verify baseline protections.

## Security Changes Applied

### 1) Auth + Authorization Hardening
- Protected previously vulnerable route:
  - `POST /api/:businessId/templates/:id/use` now requires:
    - `authMiddleware`
    - `ownerMiddleware`
    - `billingMiddleware`
  - File: `backend/routes/templatesRoutes.js`
- Added centralized admin key middleware with timing-safe comparison:
  - File: `backend/middleware/adminKeyMiddleware.js`
- Enforced admin key on plan update route:
  - `PUT /api/businesses/:businessId/plan`
  - File: `backend/routes/businessRoutes.js`

### 2) Logging Endpoint Hardening
- `GET /api/_client-log` now requires:
  - authenticated user
  - valid `x-admin-key`
- Added rate limits to:
  - `POST /api/_client-log` (ingest)
  - `GET /api/_client-log` (read)
- Added log payload redaction for sensitive values:
  - bearer tokens
  - Stripe-style keys/secrets
- File: `backend/routes/logsRoutes.js`

### 3) API Abuse Protection
- Added global API rate limiting for `/api/*` (webhook path excluded for Stripe signature flow).
- Added endpoint-specific rate limits for public write/AI endpoints:
  - `/reviews`
  - `/reviews/compose`
  - `/reviews/polish`
- Files:
  - `backend/index.js`
  - `backend/routes/templatesRoutes.js`

### 4) CORS + Header Security
- Replaced open CORS policy with allowlist-based CORS (`FRONTEND_URL` + `CORS_ORIGINS`).
- Added response hardening headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- File: `backend/index.js`

### 5) Error Leakage Reduction
- Central error handler now avoids exposing internal 5xx details in production.
- File: `backend/index.js`

### 6) Data Transport Security
- Database SSL verification now defaults to secure mode:
  - `rejectUnauthorized = true` unless explicitly disabled via env.
- File: `backend/tenantManager.js`

### 7) URL Trust Hardening
- Revoke-consent URL generation now uses normalized safe frontend base URL logic.
- Payments flow now requires configured `FRONTEND_URL` in production.
- Files:
  - `backend/controllers/templatesController.js`
  - `backend/routes/paymentsRoutes.js`

### 8) Dependency Vulnerability Remediation
- Updated dependency constraints/overrides and regenerated lockfiles.
- Latest check (prod deps): `0` vulnerabilities in backend and client.
- Files:
  - `backend/package.json`
  - `backend/package-lock.json`
  - `client/package.json`
  - `client/package-lock.json`

## Required Environment Configuration

Set these in production:

- `FRONTEND_URL=https://<your-frontend-domain>`
- `CORS_ORIGINS=https://<your-frontend-domain>[,https://other-allowed-origin]`
- `ADMIN_API_KEY=<strong-random-secret>`
- `PG_SSL_REJECT_UNAUTHORIZED=true` (recommended default)

Optional throttling controls:

- `RATE_LIMIT_MAX`
- `PUBLIC_WRITE_RATE_LIMIT_MAX`
- `AI_RATE_LIMIT_MAX`
- `LOG_INGEST_RATE_LIMIT_MAX`
- `LOG_READ_RATE_LIMIT_MAX`

Reference file: `backend/.env.example`

## Quick Security Verification Commands

Run from repo root:

```bash
npm --prefix backend audit --omit=dev --json
npm --prefix client audit --omit=dev --json
npm --prefix backend test -- --runInBand
npm --prefix client test
```

Expected current baseline:

- Backend tests: passing
- Client tests: passing
- Backend prod audit: 0 vulnerabilities
- Client prod audit: 0 vulnerabilities

## Remaining Best-Practice Improvements (Not Yet Implemented)

- Add `helmet` with CSP tuned to frontend assets.
- Add structured audit logs to a managed sink (not local file only).
- Add anomaly alerting for auth failures and rate-limit bursts.
- Consider mTLS/private networking for DB connections where possible.

