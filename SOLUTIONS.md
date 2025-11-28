# Solutions Log

This document records issues encountered during development and their solutions for future reference.

---

## 2025-11-28

### Issue #1: Blank Page - React App Not Rendering

**Symptoms:**
- All pages show blank white screen
- Browser console shows errors related to `options.factory` and `react_refresh`
- `<div id="root"></div>` is empty in DOM

**Root Cause:**
The `@supabase/supabase-js` `createClient()` function crashes when called with empty strings for URL and key. The client `.env` file was missing `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`.

**Solution:**
Modified `client/src/lib/supabaseClient.js` to handle missing env vars gracefully:

```javascript
let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase: REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY is not set. Login will not work.');
  // Create a mock supabase client to prevent crashes
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
```

---

### Issue #2: API Calls Returning Empty or Errors

**Symptoms:**
- Frontend pages load but show no data
- Admin dashboard doesn't show businesses
- Template page doesn't show templates
- `curl http://localhost:3000/api/businesses` returns "Cannot GET /businesses"

**Root Cause:**
Multiple issues:
1. `client/.env` had `REACT_APP_API_URL=http://localhost:5002/api` but backend runs on port 3001
2. `http-proxy-middleware` v3.x in `setupProxy.js` was stripping the `/api` prefix from requests

**Solution:**
1. Fixed `client/.env`:
   ```env
   PORT=3000
   REACT_APP_API_URL=/api
   ```

2. Removed `setupProxy.js` (renamed to `.bak`) and relied on `package.json` proxy:
   ```json
   {
     "proxy": "http://localhost:3001"
   }
   ```

**Why setupProxy.js failed:**
The `http-proxy-middleware` v3.x has different path handling than v2.x. When you mount at `/api`, it strips that prefix before forwarding. The `package.json` proxy approach doesn't have this issue.

---

### Issue #3: Frontend Running on Wrong Port

**Symptoms:**
- Frontend starts on port 3005 instead of 3000
- Confusing URL mismatch

**Root Cause:**
`client/.env` had `PORT=3005`

**Solution:**
Changed `client/.env` to `PORT=3000`

---

## Quick Diagnostic Commands

```bash
# Check what ports are in use
lsof -i :3000,3001 -P | grep LISTEN

# Test backend directly
curl http://localhost:3001/api/businesses

# Test frontend proxy
curl http://localhost:3000/api/businesses

# Check client env
cat client/.env

# Check if setupProxy.js exists (should be renamed to .bak)
ls -la client/src/setupProxy.js*

# View frontend logs
tail -f /tmp/frontend.log

# View backend logs
tail -f /tmp/review-backend.log
```

---

## Prevention Checklist

Before deploying, verify:

- [ ] `backend/.env` has `PORT=3001`
- [ ] `client/.env` has `PORT=3000` and `REACT_APP_API_URL=/api`
- [ ] `client/package.json` has `"proxy": "http://localhost:3001"`
- [ ] `client/src/setupProxy.js` does NOT exist (or is renamed)
- [ ] If using Supabase auth, set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in `client/.env`
