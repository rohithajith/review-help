# Review-Help

A multi-tenant SaaS platform that helps businesses collect authentic customer reviews through AI-powered customizable templates.

🌐 **Website**: [reviewhelp.uk](https://reviewhelp.uk)

## Quick Start

```bash
./start.sh    # Start backend (3001) + frontend (3004)
./stop.sh     # Stop all services
```

## Features

- **AI-Powered Templates** — GPT-4o-mini generates personalized review templates on signup
- **Multi-Tenant** — Isolated data per business with role-based access
- **Stripe Billing** — Subscription tiers (Starter/Pro/Pro Max/Enterprise)
- **Template Rotation** — Used templates auto-archive; backups promote to active
- **Contact Forms** — Integrated email notifications via SMTP (Nodemailer)
- **Enterprise Inquiries** — Detailed business inquiry form for enterprise plan
- **Mobile Responsive** — Fully optimized for mobile devices
- **Sticky Navigation** — Animated navbar with scroll effects

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Material UI 7 |
| Backend | Node.js, Express |
| Database | Supabase (Postgres) |
| AI | OpenRouter (GPT-4o-mini, Gemma 3 fallback) |
| Payments | Stripe |
| Auth | Supabase Auth |
| Email | Nodemailer (IONOS SMTP) |

## Environment Variables

### Backend (`backend/.env`)
```env
# Database
ADMIN_DATABASE_URL=postgresql://...

# AI Generation
OPENROUTER_API_KEY=sk-or-v1-...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (IONOS SMTP)
SMTP_HOST=smtp.ionos.co.uk
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS="your-password"
SMTP_FROM="Your Brand <your-email@yourdomain.com>"
CONTACT_EMAIL=your-email@yourdomain.com
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
| `POST /api/contact` | Submit contact form |
| `POST /api/contact/enterprise` | Submit enterprise inquiry |

## Project Structure

```
├── backend/
│   ├── controllers/     # Business logic
│   ├── routes/          # API endpoints (templates, contact, payments)
│   ├── services/        # AI generation
│   ├── middleware/      # Auth, plans
│   └── jobs/            # Cron tasks
├── client/
│   ├── public/          # Static assets (logo, favicon)
│   └── src/
│       ├── components/  # React components
│       │   ├── Landing.js              # Landing page (mobile responsive)
│       │   ├── Navbar.js               # Sticky animated navbar
│       │   ├── EnterpriseInquiryModal.js # Enterprise plan form
│       │   └── ...
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Supabase client
└── scripts/             # Utilities
```

## Recent Updates

- ✅ Contact form with email notifications
- ✅ Enterprise inquiry modal for custom plans
- ✅ Mobile-responsive landing page
- ✅ Sticky navbar with scroll animation
- ✅ Brand logo integration
- ✅ IONOS SMTP email configuration

## License

ISC
