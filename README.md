# Review App

A multi-tenant web app that helps customers compose and submit authentic Google reviews for businesses.

> **Important**: The app does NOT auto-post reviews. All reviews are edited and submitted manually by customers for authenticity and compliance.

## Quick Start (Local/GCP)

```bash
cd ~/project/review-help  # or your project directory
./start.sh
```

This starts:
- **Backend API** on port 3001
- **React Frontend** on port 3000
- **Cron Jobs** for background template generation (daily at 2 AM)

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
| Super Admin Dashboard | http://localhost:3000/#/admin | Manage ALL businesses, templates, settings, credentials |

### For Business Owners (Myra's Fish Bar Example)

| Page | URL | Purpose |
|------|-----|---------|
| Customer Page | http://localhost:3000/#/business/2 | Customers pick template, copy & leave review |
| Business Admin | http://localhost:3000/#/business/2/admin | Myra edits her own templates (requires login) |

### URL Pattern for Any Business

| Role | URL Pattern | Access Level |
|------|-------------|--------------|
| Customers | `/#/business/{id}` | View templates, copy text, leave review |
| Business Owner | `/#/business/{id}/admin` | Edit/add/delete their templates only (login required) |
| Super Admin | `/#/admin` | Full access to all businesses |

---

## Current Businesses

| ID | Name | Customer URL | Admin URL |
|----|------|--------------|-----------|
| 1 | Demo Restaurant | `/#/business/1` | `/#/business/1/admin` |
| 2 | Myra's Fish Bar | `/#/business/2` | `/#/business/2/admin` |

---

## Features

### 🔐 Business Admin Authentication
- Business owners must log in to access their admin panel
- First-time access: Owner creates their own credentials
- Super Admin can set/reset credentials from the dashboard
- Session-based authentication (cleared on browser close)

### 🎯 Customizable Review Platforms
- Configure multiple review platforms per business (Google, Booking.com, TripAdvisor, etc.)
- Customers choose which platform to review on when clicking "Copy & Leave Review"
- Add custom platforms with names and URLs

### 🤖 AI Template Generation (Background)
- Automatic generation using OpenRouter AI (Llama 3.1 8B - FREE)
- Runs daily at 2 AM via cron job
- Triggers when 10 templates are archived (used by customers)
- Generates unique templates based on real customer feedback

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

### AI Template Generation (OpenRouter)

The app uses AI to automatically generate fresh review templates based on real customer feedback.

**When is AI triggered?**
- Automatically when 10 templates have been used and archived
- Urgently if the backup pool is empty when a template is used

**Flow Diagram:**
```
┌─────────────────────┐
│ Customer uses       │
│ review template     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Archive edited text │
│ Rotate in backup    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ archived_count ≥ 10?│
└─────────┬───────────┘
          │ Yes
          ▼
┌─────────────────────┐
│ Call OpenRouter AI  │
│ (background job)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Generate 10 new     │
│ backup templates    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Clear archived,     │
│ store new backups   │
└─────────────────────┘
```

**How it works:**
1. Reads 10 archived reviews (real customer edits)
2. Sends them to OpenRouter API (Llama 3.1 8B model - free tier)
3. AI learns the tone, style, and themes from real reviews
4. Generates 10 unique new templates (validated for uniqueness)
5. Replaces all backup templates with AI-generated ones
6. Clears archived templates (resets the cycle)

**API Configuration:**
| Setting | Value |
|---------|-------|
| Endpoint | `https://api.openrouter.ai/v1/chat/completions` |
| Model | `meta-llama/llama-3.1-8b-instruct:free` |
| Max retries | 3 (with exponential backoff) |
| Timeout | 120 seconds |

**To enable:** Set `OPENROUTER_API_KEY` in `backend/.env` (get key from [openrouter.ai/keys](https://openrouter.ai/keys))

### Business Owner Access
- Owner visits `/#/business/2/admin`
- **Must log in** with credentials (set by Super Admin or created on first visit)
- Can add, edit, delete their own templates
- Cannot see other businesses' data
- Cannot access system settings

---

## Tech Stack

- **Frontend**: React 19 + Material UI v7.3.5
- **Backend**: Node.js + Express (port 3001)
- **Database**: Supabase (managed Postgres)
- **AI**: OpenRouter (Llama 3.1 8B - free tier)
- **Multi-tenancy**: Data isolated by `business_id` column
- **Auth**: bcrypt password hashing, session tokens

## Configuration

### Backend Environment (`backend/.env`)
```env
# Required
ADMIN_DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres

# Optional
PORT=3001
NODE_ENV=production
OPENROUTER_API_KEY=sk-or-v1-xxxxx          # For AI template generation
TEMPLATE_GENERATION_CRON=0 2 * * *          # Cron schedule (default: 2 AM daily)
ENABLE_CRON_JOBS=true                       # Set to 'false' to disable
```

### Client Environment (`client/.env`)
```env
PORT=3000
REACT_APP_API_URL=/api
```

### Proxy Configuration
The React dev server proxies `/api` to the backend via `package.json`:
```json
{
  "proxy": "http://localhost:3001"
}
```

---

## API Endpoints

### Business Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | List all businesses |
| POST | `/api/businesses` | Create a business |
| GET | `/api/:id/business` | Get business details |
| PUT | `/api/:id/business` | Update business (name, platforms, etc.) |

### Business Admin Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/admin/has-credentials` | Check if credentials exist |
| POST | `/api/businesses/:id/admin/credentials` | Set/reset admin credentials |
| POST | `/api/businesses/:id/admin/login` | Verify admin login |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:id/templates` | Get active templates |
| POST | `/api/:id/templates` | Create template |
| PUT | `/api/:id/templates/:tid` | Update template |
| DELETE | `/api/:id/templates/:tid` | Delete template |
| DELETE | `/api/:id/templates/bulk` | Bulk delete |
| POST | `/api/:id/templates/:tid/use` | Archive & rotate (customer action) |

### Backup Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:id/templates/backups` | Get backup templates |
| POST | `/api/:id/templates/backups` | Create backup |
| PUT | `/api/:id/templates/backups/:tid` | Update backup |
| DELETE | `/api/:id/templates/backups/:tid` | Delete backup |

### AI Generation (Background)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/generation/status` | Status for ALL businesses |
| POST | `/api/businesses/generation/trigger-all` | Trigger generation for ALL |
| GET | `/api/:id/templates/generation/status` | Status for one business |
| POST | `/api/:id/templates/generation/trigger` | Trigger for one business |

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
businesses (id, name, google_review_url, logo_url, welcome_message, review_platforms JSONB)

-- Business admin credentials
business_admin_credentials (id, business_id, username, password_hash, created_at, updated_at)

-- Users (Supabase auth)
users (id UUID, email, created_at)

-- Business ownership mapping
business_owners (id, business_id, user_id, role, created_at)
```

---

## Project Structure

```
review-help/
├── start.sh              # One-click start (backend + frontend)
├── stop.sh               # Stop all services
├── README.md             # This file
├── CHANGELOG.md          # Version history
├── SOLUTIONS.md          # Bug fixes documentation
├── backend/
│   ├── .env              # Database config (not in git)
│   ├── index.js          # Express server entry
│   ├── tenantManager.js  # DB connection & schema
│   ├── controllers/      # API handlers
│   │   ├── businessController.js  # Business CRUD + auth
│   │   ├── templatesController.js # Template operations
│   │   └── userController.js      # User onboarding
│   ├── routes/           # Route definitions
│   ├── middleware/       # Business ID & auth middleware
│   ├── jobs/             # Background jobs
│   │   ├── templateGenerationJob.js  # AI generation logic
│   │   └── cronScheduler.js          # Cron job scheduler
│   └── services/
│       └── generationService.js  # OpenRouter AI integration
├── client/
│   ├── .env              # Client config
│   ├── src/
│   │   ├── App.js        # Main router & pages
│   │   ├── api.js        # Axios API client
│   │   └── components/
│   │       ├── AdminDashboard.js    # Super admin
│   │       ├── BusinessAdmin.js     # Business owner admin
│   │       ├── BusinessLoginModal.js # Login popup
│   │       ├── TemplateList.js      # Customer template cards
│   │       └── EditModal.js         # Template editor + platform choice
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
| `TEMPLATE_GENERATION_CRON` | No | `0 2 * * *` | Cron schedule for AI generation |
| `ENABLE_CRON_JOBS` | No | `true` | Set to 'false' to disable cron |

---

## Setting Up a New Business

### Via Super Admin Dashboard (Recommended)
1. Go to `http://localhost:3000/#/admin`
2. Enter business name and click "Create"
3. Select the new business from dropdown
4. Configure:
   - Welcome message
   - Review platforms (Google, Booking.com, etc.)
5. Set admin credentials in "Business Admin Access" card
6. Share with business owner:
   - Customer URL: `http://localhost:3000/#/business/{id}`
   - Admin URL: `http://localhost:3000/#/business/{id}/admin`
   - Username and password you created

### Via API
```bash
# 1. Create business
curl -X POST http://localhost:3001/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name": "New Business"}'

# 2. Set review platforms (use returned ID, e.g., 3)
curl -X PUT http://localhost:3001/api/3/business \
  -H "Content-Type: application/json" \
  -d '{
    "review_platforms": [
      {"name": "Google", "url": "https://g.page/r/..."},
      {"name": "TripAdvisor", "url": "https://tripadvisor.com/..."}
    ]
  }'

# 3. Set admin credentials
curl -X POST http://localhost:3001/api/businesses/3/admin/credentials \
  -H "Content-Type: application/json" \
  -d '{"username": "owner", "password": "securepass123"}'
```

---

## License

ISC License
