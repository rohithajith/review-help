# Review App

A web app that helps customers compose and submit authentic Google reviews for businesses.

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

**URLs:**
| Page | URL |
|------|-----|
| Template Page | http://localhost:3000/ |
| Admin Dashboard | http://localhost:3000/#/admin |
| Backend API | http://localhost:3001/api |

**Stop services:**
```bash
./stop.sh
```

**View logs:**
```bash
tail -f /tmp/review-backend.log   # Backend
tail -f /tmp/review-client.log    # Frontend
```

## Current Businesses

| ID | Name | Templates |
|----|------|-----------|
| 1 | Demo Restaurant | 10 active, 10 backup |
| 2 | Myra's Fish Bar | 10 active (fish & chips), 10 backup |

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
| POST | `/api/:id/templates/:tid/use` | Archive & rotate |

## Template Rotation Flow

1. Customer edits template and clicks "Copy & Review"
2. Edited text archived to `archived_templates`
3. Template removed from `review_templates`
4. Backup promoted from `backup_templates` to active
5. After 10 archives, AI generates new backups (optional)

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

## Adding a Business

```bash
# Create business
curl -X POST http://localhost:3001/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name": "New Business"}'

# Update with Google review URL
curl -X PUT http://localhost:3001/api/BUSINESS_ID/business \
  -H "Content-Type: application/json" \
  -d '{"google_review_url": "https://..."}'

# Add templates
curl -X POST http://localhost:3001/api/BUSINESS_ID/templates \
  -H "Content-Type: application/json" \
  -d '{"text": "Your review template..."}'
```

## Project Structure

```
review-help/
├── start.sh              # Start all services
├── stop.sh               # Stop all services
├── backend/
│   ├── .env              # Database config
│   ├── index.js          # Express server
│   ├── tenantManager.js  # DB & schema
│   ├── controllers/      # API handlers
│   ├── routes/           # Route definitions
│   └── middleware/       # Business middleware
├── client/
│   ├── src/
│   │   ├── App.js        # Main app
│   │   ├── api.js        # API client
│   │   ├── setupProxy.js # Dev proxy
│   │   └── components/   # React components
│   └── public/logos/     # Business logos
└── scripts/              # Utility scripts
```

## Troubleshooting

### Port already in use
```bash
./stop.sh
# or
pkill -f "node.*index.js"
pkill -f "react-scripts"
```

### API calls failing
1. Check backend is running: `curl http://localhost:3001/`
2. Check proxy config in `client/src/setupProxy.js`
3. Restart frontend after proxy changes

### Database connection failed
1. Verify `ADMIN_DATABASE_URL` in `backend/.env`
2. Check Supabase project is active
3. URL-encode special characters: `&`→`%26`, `@`→`%40`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_DATABASE_URL` | Yes | - | Supabase connection string |
| `PORT` | No | 3001 | Backend port |
| `NODE_ENV` | No | development | Environment |
| `OPENROUTER_API_KEY` | No | - | For AI template generation |

## License

ISC License
