# Review App

A multi-tenant SaaS platform that helps businesses collect customer reviews through an in-app-first flow.

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
- **In-App Review First** — Customers submit rating + review text inside the app before any external channel step
- **My Reviews** — Every submitted review is stored centrally per business and visible in Business Admin

## Customer Flow (Current)

1. Customer scans QR and lands on `/#/business/:businessId`
2. Customer selects a review template (if multiple)
3. Customer submits rating + review text inside the app
4. Review is saved immediately to that business (`My Reviews`)
5. Success message is shown: `Review taken`
6. Post-submit popup offers:
   - Post on Google
   - Post on TripAdvisor
   - Skip
7. If a channel is selected, the platform link opens and the same review text is available to copy/paste manually

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
| `POST /api/users/onboard` | Create business + generate AI templates |
| `GET /api/:businessId/templates` | Get active templates |
| `POST /api/:businessId/reviews` | Submit in-app review (rating + review text) |
| `GET /api/:businessId/reviews` | Get all saved reviews for My Reviews |
| `POST /api/:businessId/templates/:id/use` | Archive/rotate template (legacy template-use path) |
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
