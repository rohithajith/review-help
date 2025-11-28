# Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased] - 2025-11-28

### Added

#### Business Admin Authentication
- **New Feature**: Business admin pages now require login authentication
- Added `business_admin_credentials` table to store hashed passwords (bcrypt)
- First-time access shows a "Set Up Admin Access" modal for the business owner
- Subsequent access requires username/password login
- Session tokens stored in sessionStorage (cleared when browser closes)
- Logout button added to BusinessAdmin header
- **Super Admin Dashboard** now includes:
  - "Business Admin Access" card when a business is selected
  - Set/Reset credentials for any business
  - Copy admin URL button
  - Open admin page button
  - Status indicator (Credentials Set / Not Configured)
- **Files changed**:
  - `backend/tenantManager.js` - Added business_admin_credentials table
  - `backend/controllers/businessController.js` - Added setAdminCredentials, verifyAdminLogin, hasAdminCredentials
  - `backend/routes/businessRoutes.js` - Added auth endpoints
  - `client/src/components/BusinessLoginModal.js` - New login modal component
  - `client/src/components/BusinessAdmin.js` - Auth wrapper and logout
  - `client/src/components/AdminDashboard.js` - Credentials management UI

#### Customizable Review Platforms Feature
- **New Feature**: Admins can now configure custom review platforms (Google, Booking.com, TripAdvisor, or any custom platform)
- Added `review_platforms` JSONB column to the `businesses` table
- Admin Dashboard now has a "Review Platforms" section where you can:
  - Add new review platforms with custom names and URLs
  - Edit existing platform names and URLs
  - Remove platforms (minimum 1 required)
  - Test links directly from the admin panel
- When customers click "Copy & Review":
  - If multiple platforms are configured, they see a choice dialog
  - If only one platform is configured, it opens directly
  - Platforms without URLs are hidden from customers
- **Files changed**:
  - `backend/tenantManager.js` - Added review_platforms column
  - `backend/controllers/businessController.js` - Handle review_platforms in CRUD
  - `client/src/components/AdminDashboard.js` - Platform editor UI
  - `client/src/components/EditModal.js` - Platform selection dialog
  - `client/src/App.js` - Pass platforms to EditModal

### Fixed

#### Blank Page Issue - Supabase Client Crash
- **Problem**: Frontend showed blank pages because `createClient()` from `@supabase/supabase-js` was called with empty strings when `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` were not set in the client `.env` file
- **Solution**: Modified `client/src/lib/supabaseClient.js` to create a mock supabase client when env vars are missing, preventing crashes and allowing the app to run (with login disabled)
- **File changed**: `client/src/lib/supabaseClient.js`

#### API Proxy Not Working - Wrong Port Configuration
- **Problem**: Client `.env` had `REACT_APP_API_URL=http://localhost:5002/api` but backend was running on port 3001
- **Solution**: Changed `client/.env` to use `/api` (relative path) to use the dev server proxy
- **File changed**: `client/.env`

#### API Proxy Stripping /api Prefix
- **Problem**: `http-proxy-middleware` v3.x in `setupProxy.js` was stripping the `/api` prefix, causing requests to `/api/businesses` to be forwarded as `/businesses` to the backend
- **Solution**: Removed `setupProxy.js` (renamed to `.bak`) and using the simpler `"proxy": "http://localhost:3001"` in `package.json` which works correctly
- **File changed**: `client/src/setupProxy.js` → `client/src/setupProxy.js.bak`

#### Frontend Port Mismatch
- **Problem**: `client/.env` had `PORT=3005` causing frontend to run on wrong port
- **Solution**: Changed `PORT=3000` in `client/.env`
- **File changed**: `client/.env`

---

## Configuration Reference

### Correct Port Configuration

| Service | Port | Config Location |
|---------|------|-----------------|
| Backend | 3001 | `backend/.env` → `PORT=3001` |
| Frontend | 3000 | `client/.env` → `PORT=3000` |

### Correct client/.env

```env
PORT=3000
REACT_APP_API_URL=/api
```

### Correct Proxy Setup

Use `package.json` proxy (simpler, works better):
```json
{
  "proxy": "http://localhost:3001"
}
```

Do NOT use `setupProxy.js` with `http-proxy-middleware` v3.x as it has path-stripping issues.
