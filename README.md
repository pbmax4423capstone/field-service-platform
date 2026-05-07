# FieldPro — Field Service Platform

A full-stack SaaS platform for HVAC contractors. Multi-tenant, built on Next.js + Supabase + Stripe.

## Project Structure

```
/apps
  /web          — Next.js 16 dashboard (contractor-facing)
  /mobile       — React Native + Expo app (technician-facing) [Phase 4]
  /widget       — Embeddable booking widget (customer-facing) [Phase 5]
  /marketing    — Platform marketing site [Phase 8]
/packages
  /shared       — TypeScript types, constants, utilities
  /ui           — Shared UI component library
  /api-client   — Typed Supabase client wrapper
/supabase
  /migrations   — SQL migration files (run in order)
  /seed         — Demo data for testing
  /functions    — Edge functions
```

## Quick Start

### 1. Prerequisites

- Node.js 22+
- pnpm 10+
- A Supabase project (supabase.com)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the Supabase SQL editor, run the migrations **in order**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_auth_setup.sql`
3. Optionally run `supabase/seed/001_demo_data.sql` for demo data

### 4. Configure environment variables

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API (keep secret!)

### 5. Start the dev server

```bash
pnpm dev
# or just the web app:
pnpm --filter @field-service/web dev
```

Open [http://localhost:3000](http://localhost:3000)

## Signing Up

Go to `/signup` to create your contractor account. The auth trigger automatically:
- Creates an Organization for your business
- Creates your User profile
- Assigns you the `admin` role
- Creates a default Price Book
- Sets up default notification preferences

## Features Built

### Phase 1 ✅ — Database & Auth
- Complete multi-tenant schema (28 tables)
- Row-Level Security (RLS) policies — Contractor A cannot see Contractor B's data
- Supabase Auth with automatic org creation on signup
- TypeScript types for every table

### Phase 2 ✅ — Web Dashboard
- Login / Signup pages
- Auth-gated routes (middleware)
- Sidebar navigation
- Dashboard home: today's jobs, revenue stats, upcoming appointments, activity feed
- Jobs list (filterable by status) + Job detail page
- Customers list + Customer detail (service history, invoices, equipment)
- Invoices list (filterable by status)
- Price book (categorized, edit/add coming)
- Bookings management (incoming from widget/AI)
- Settings (business profile, AI features, Stripe connect)

### Phases 3-8 — Coming Next
- Phase 3: Stripe Connect payments, estimates, invoice PDF generation
- Phase 4: Mobile app (Expo) for technicians
- Phase 5: Twilio/SendGrid notifications + embeddable booking widget
- Phase 6: AI chat agent (Claude API)
- Phase 7: AI voice agent (Twilio + Deepgram + OpenAI TTS)
- Phase 8: Social media scheduling, website builder, app store launch

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS v4 |
| Type safety | TypeScript |
| Monorepo | Turborepo + pnpm |
| Payments | Stripe Connect |
| SMS | Twilio |
| Email | SendGrid |
| AI | Anthropic Claude API |
| Mobile | Expo + React Native |

## Environment Variables Reference

```bash
# Required for web dashboard
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key (public, safe to expose)
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (server-only, keep secret)

# Payments (Phase 3)
STRIPE_SECRET_KEY=                 # Stripe secret key
STRIPE_PUBLISHABLE_KEY=            # Stripe publishable key
STRIPE_WEBHOOK_SECRET=             # Stripe webhook signing secret

# Notifications (Phase 5)
TWILIO_ACCOUNT_SID=                # Twilio account SID
TWILIO_AUTH_TOKEN=                 # Twilio auth token
TWILIO_PHONE_NUMBER=               # Your Twilio phone number

SENDGRID_API_KEY=                  # SendGrid API key

# AI Agents (Phases 6-7)
ANTHROPIC_API_KEY=                 # Claude API key

# App
NEXT_PUBLIC_APP_URL=               # Your app URL (http://localhost:3000 for dev)
```

## Database Schema Overview

28 tables organized by domain:

- **Multi-tenant core**: `organizations`, `users`, `user_roles`
- **CRM**: `customers`, `customer_addresses`, `customer_equipment`
- **Jobs**: `jobs`, `job_line_items`, `job_photos`, `job_notes`, `job_status_history`
- **Financial**: `estimates`, `estimate_line_items`, `invoices`, `invoice_line_items`, `payments`
- **Catalog**: `price_books`, `price_book_items`
- **Communications**: `notification_preferences`, `notification_logs`, `review_requests`
- **Online**: `bookings`, `leads`
- **AI**: `chat_conversations`, `voice_calls`
- **Social**: `social_accounts`, `social_posts`
