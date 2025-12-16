# Review App

A multi-tenant SaaS platform that helps businesses collect authentic customer reviews through customizable templates.

## Quick Start

```bash
./start.sh    # Start backend (4000) + frontend (3004)
./stop.sh     # Stop all services
```

## Features

- **AI-Powered Templates** — GPT-4o-mini generates personalized review templates on signup
- **Multi-Tenant** — Isolated data per business with role-based access
- **Stripe Billing** — Subscription tiers (Starter/Pro/Pro Max/Enterprise)
- **Template Rotation** — Used templates auto-archive; backups promote to active

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Material UI 7 |
| Backend | Node.js, Express |
| Database | Supabase (Postgres) |
| AI | OpenRouter (GPT-4o-mini, Gemma 3 fallback) |
| Payments | Stripe |
| Auth | Supabase Auth |

## Environment Variables

### Backend (`backend/.env`)
```env
ADMIN_DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-v1-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Client (`client/.env`)
```env
PORT=3004
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/user/onboard` | Create business + generate AI templates |
| `GET /api/:id/templates` | Get active templates |
| `POST /api/:id/templates/:tid/use` | Archive & rotate template |
| `POST /api/payments/create-checkout-session` | Stripe checkout |

## Project Structure

```
├── backend/
│   ├── controllers/     # Business logic
│   ├── routes/          # API endpoints
│   ├── services/        # AI generation
│   ├── middleware/      # Auth, plans
│   └── jobs/            # Cron tasks
├── client/
│   └── src/components/  # React components
└── scripts/             # Utilities
```

## License

ISC
