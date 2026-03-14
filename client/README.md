# Client (Vite)

Frontend for Review App, migrated from CRA to Vite.

## Scripts

- `npm run dev` or `npm start` - run local dev server
- `npm run build` - production build to `dist/`
- `npm run preview` - preview production build
- `npm test` - run Vitest test suite

## Environment

The app supports both env prefixes for compatibility:

- `VITE_*` (native Vite)
- `REACT_APP_*` (legacy keys)

Examples:

- `REACT_APP_API_URL` or `VITE_API_URL`
- `REACT_APP_SUPABASE_URL` or `VITE_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`

## API Proxy (dev)

`vite.config.js` proxies `/api` to `http://localhost:4000` by default.
Override with `VITE_BACKEND_URL` if needed.
