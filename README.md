# Review App

A multi-tenant web app that helps customers compose and submit authentic Google reviews for businesses.

> **Important**: The app does NOT auto-post reviews. All reviews are edited and submitted manually by customers for authenticity and compliance.

## Quick Start (GCP)

After starting your GCP instance:

```bash
cd ~/project/review-help
./start.sh
```

This starts:
- **Backend API** on port 3001
- **React Frontend** on port 3000

**Stop services:**
```bash
./stop.sh
```

**View logs:**
```bash
tail -f /tmp/review-backend.log   # Backend
tail -f /tmp/review-client.log    # Frontend
```

---

## URL Structure

### For You (Super Admin)

| Page | URL | Purpose |
|------|-----|---------|
| Super Admin Dashboard | http://localhost:3000/#/admin | Manage ALL businesses, templates, settings |

### For Business Owners (Myra's Fish Bar Example)

| Page | URL | Purpose |
|------|-----|---------|
| Customer Page | http://localhost:3000/#/business/2 | Customers pick template, copy & leave review |
| Business Admin | http://localhost:3000/#/business/2/admin | Myra edits her own templates |

### URL Pattern for Any Business

| Role | URL Pattern | Access Level |
|------|-------------|--------------|
| Customers | `/#/business/{id}` | View templates, copy text, leave review |
| Business Owner | `/#/business/{id}/admin` | Edit/add/delete their templates only |
| Super Admin | `/#/admin` | Full access to all businesses |

---

## Current Businesses

| ID | Name | Customer URL | Admin URL |
|----|------|--------------|-----------|
| 1 | Demo Restaurant | `/#/business/1` | `/#/business/1/admin` |
| 2 | Myra's Fish Bar | `/#/business/2` | `/#/business/2/admin` |

---

## How It Works

### Customer Flow
1. Customer visits `/#/business/2` (Myra's Fish Bar)
2. Sees 10 review templates with Myra's logo
3. Picks a template, optionally edits it
4. Clicks "Copy & Leave Review"
5. Text copied → Google Review page opens → Customer pastes & submits

### Template Rotation
1. When a template is used, it gets archived
2. A backup template is promoted to replace it
3. This ensures fresh, unique reviews

### Business Owner Access
- Owner visits `/#/business/2/admin`
- Can add, edit, delete their own templates
- Cannot see other businesses' data
- Cannot access system settings

---

## Tech Stack

- **Frontend**: React 19 + Material UI v7.3.5
- **Backend**: Node.js + Express (port 3001)
- **Database**: Supabase (managed Postgres)
- **Multi-tenancy**: Data isolated by `business_id` column

## Configuration

### Backend Environment (`backend/.env`)
```env
ADMIN_DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
PORT=3001
NODE_ENV=production
```

### Proxy Configuration
The React dev server proxies `/api` to the backend:
- `client/src/setupProxy.js` - proxy middleware (port 3001)
- `client/package.json` - proxy fallback setting

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | List all businesses |
| POST | `/api/businesses` | Create a business |
| GET | `/api/:id/business` | Get business details |
| PUT | `/api/:id/business` | Update business |
| GET | `/api/:id/templates` | Get active templates |
| POST | `/api/:id/templates` | Create template |
| PUT | `/api/:id/templates/:tid` | Update template |
| DELETE | `/api/:id/templates/:tid` | Delete template |
| DELETE | `/api/:id/templates/bulk` | Bulk delete |
| GET | `/api/:id/templates/backups` | Get backup templates |
| POST | `/api/:id/templates/backups` | Create backup |
| PUT | `/api/:id/templates/backups/:tid` | Update backup |
| DELETE | `/api/:id/templates/backups/:tid` | Delete backup |
| POST | `/api/:id/templates/:tid/use` | Archive & rotate |

---

## Adding a New Business

### 1. Create the business
```bash
curl -X POST http://localhost:3001/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name": "New Business Name"}'
```

### 2. Note the returned ID (e.g., 3)

### 3. Set Google Review URL
```bash
curl -X PUT http://localhost:3001/api/3/business \
  -H "Content-Type: application/json" \
  -d '{"google_review_url": "https://www.google.com/search?q=Your+Business+Reviews#lrd=..."}'
```

### 4. Add templates (repeat 10x for active, 10x for backups)
```bash
# Active template
curl -X POST http://localhost:3001/api/3/templates \
  -H "Content-Type: application/json" \
  -d '{"text": "Your 80-100 word review template..."}'

# Backup template
curl -X POST http://localhost:3001/api/3/templates/backups \
  -H "Content-Type: application/json" \
  -d '{"text": "Your backup review template..."}'
```

### 5. (Optional) Add logo
- Save logo to `client/public/logos/your-business.png`
- Update `businessLogos` map in `client/src/App.js`

### 6. Share URLs with business owner
- Customer page: `http://your-domain/#/business/3`
- Admin page: `http://your-domain/#/business/3/admin`

---

## Database Schema

All tables include `business_id` for multi-tenant isolation:

```sql
-- Active templates (shown to users)
review_templates (id, business_id, text, used, created_at)

-- Backup pool (for rotation)
backup_templates (id, business_id, text, created_at)

-- Archived (for AI learning)
archived_templates (id, business_id, text, archived_at)

-- Business registry
businesses (id, name, google_review_url, logo_url, welcome_message)
```

---

## Project Structure

```
review-help/
├── start.sh              # One-click start (backend + frontend)
├── stop.sh               # Stop all services
├── README.md             # This file
├── backend/
│   ├── .env              # Database config (not in git)
│   ├── index.js          # Express server entry
│   ├── tenantManager.js  # DB connection & schema
│   ├── controllers/      # API handlers
│   ├── routes/           # Route definitions
│   └── middleware/       # Business ID middleware
├── client/
│   ├── src/
│   │   ├── App.js        # Main router & pages
│   │   ├── api.js        # Axios API client
│   │   ├── setupProxy.js # Dev proxy to backend
│   │   └── components/
│   │       ├── AdminDashboard.js  # Super admin
│   │       ├── BusinessAdmin.js   # Business owner admin
│   │       ├── TemplateList.js    # Customer template cards
│   │       └── EditModal.js       # Template editor
│   └── public/logos/     # Business logos
└── scripts/              # Utility/seeding scripts
```

---

## Troubleshooting

### Port already in use
```bash
./stop.sh
# or manually:
pkill -9 -f "node.*index.js"
pkill -9 -f "react-scripts"
```

### API calls failing
1. Check backend: `curl http://localhost:3001/`
2. Check proxy config in `client/src/setupProxy.js`
3. Restart frontend after proxy changes

### Database connection failed
1. Verify `ADMIN_DATABASE_URL` in `backend/.env`
2. Check Supabase project is active
3. URL-encode special characters: `&`→`%26`, `@`→`%40`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_DATABASE_URL` | Yes | - | Supabase connection string |
| `PORT` | No | 3001 | Backend port |
| `NODE_ENV` | No | development | Environment |
| `OPENROUTER_API_KEY` | No | - | For AI template generation |

---

## License

ISC License
