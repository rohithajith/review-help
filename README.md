# Review App

A multi-tenant SaaS platform that helps businesses collect customer reviews through an in-app-first flow.

## Quick Start

```bash
./start.sh    # Start backend (4000) + frontend (3004)
./stop.sh     # Stop all services
```

## Features

- **AI-Powered Templates** — GPT-4o-mini generates personalized review templates on signup
- **AI Compose + Polish** — Guided hotel/service Q&A can generate review drafts; Polish rewrites text for grammar and clarity
- **Multi-Tenant** — Isolated data per business with role-based access
- **Stripe Billing** — Subscription tiers (Starter/Pro/Pro Max/Enterprise)
- **Template Rotation** — Used templates auto-archive; backups promote to active
- **Flexible Review Entry** — Users can write their own review or use/edit templates
- **Save-First Review Flow** — Reviews are saved in-app before any external-share prompt
- **Consent + Revocation** — Template-based submission stores consent and returns a one-time revoke link
- **Revoke Link UX** — Success modal can display revoke link with copy/open actions for anonymous customers
- **My Reviews** — Every submitted review is stored centrally per business and visible in Business Admin
- **Branding + External Links in Admin** — Owners can upload logo and manage review-platform URLs from Business Admin
- **Signup Template Generation Loading** — New owners see a spinner in admin while onboarding templates are being generated

## Customer Flow (Current)

1. Customer scans QR and lands on `/#/business/:businessId`
2. Customer writes their own review in the white review box, or taps `Compose` for AI-assisted drafting
3. `Compose` opens a guided Q&A (5 core hotel/service questions + up to 2 adaptive backup questions)
4. AI-generated output is inserted into the own-review box; `Polish` can further rewrite for grammar/clarity
5. If user clicks `I'm busy`, templates are shown; template selection opens an editor modal
6. Template-based submission requires explicit marketing/public-use consent (stored for audit)
7. Template success modal can show revoke link (`Copy Link` / `Open Revoke Page`) and stores review in-app
8. Own-review path saves review first, then opens sharing prompt
9. Post-action popup offers:
   - Post on Google
   - Post on TripAdvisor
   - Skip
10. If a channel is selected, the platform link opens in a new tab with review text ready to paste

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
| `POST /api/:businessId/reviews/compose` | Generate review text from guided answers (AI) |
| `POST /api/:businessId/reviews/polish` | Rewrite review text for grammar/clarity (AI) |
| `POST /api/:businessId/reviews` | Submit in-app review; returns `revokeConsentUrl` and `revokeAvailable` when consent is granted |
| `GET /api/:businessId/reviews` | Get all saved reviews for My Reviews |
| `POST /api/reviews/consent/revoke` | Public token-based consent revocation |
| `POST /api/:businessId/reviews/:id/consent/revoke` | Owner/admin revoke consent for a saved review |
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
