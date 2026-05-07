# FieldPro — Field Service Platform

A full-stack SaaS platform for HVAC contractors. Multi-tenant, built on Next.js + Supabase + Stripe.

## Project Structure

```
/apps
  /web          — Next.js 16 dashboard (contractor-facing)
  /mobile       — React Native + Expo app (technician-facing) ✅
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
   - `supabase/migrations/004_phase3_payments.sql`
   - `supabase/migrations/005_phase4_mobile.sql`
   - `supabase/migrations/006_phase7_voice.sql`
   - `supabase/migrations/007_phase8_social.sql`
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

### Phase 3 ✅ — Payments, Estimates & Invoicing
- **Stripe Connect** — Contractors connect their Stripe account via Settings → Payments; full OAuth onboarding flow
- **Stripe Webhooks** — `payment_intent.succeeded` automatically marks invoices as paid; `account.updated` confirms onboarding
- **Estimates** — Full CRUD (create, list, detail, mark sent, delete); convert accepted estimate → invoice in one click
- **Invoice detail page** — Line items, totals (subtotal + tax + balance due), payment history, status badge
- **Invoice PDF generation** — `/api/invoices/[id]/pdf` streams a professionally formatted PDF using pdfkit
- **Customer payment page** — Public `/pay/[token]` page with Stripe Elements card form; no auth required; shows invoice details
- **New Invoice modal** — Create invoices with dynamic line items, live total calculation, customer select
- **New Estimate modal** — Same as invoice modal with valid-until date instead of due date
- **Payment link copy** — One-click copy of the public payment URL from the invoice detail page

### Phase 4 ✅ — Mobile App (Expo) for Technicians
- **Auth** — Supabase Auth login with session persistence; auto-redirect on login/logout; logout from More tab
- **Today tab** — Jobs assigned to the technician scheduled today; job title, customer name, address (tap-to-navigate), phone (tap-to-call), time, status badge; pull-to-refresh
- **Jobs tab** — Full job list filtered to technician's jobs; filterable by status (All, Scheduled, Dispatched, En Route, In Progress, Completed); tap to open job detail
- **Job detail screen** — Customer info, address with "Open in Maps" button, scheduled time, description, status update buttons (advances through valid transitions: scheduled → dispatched → en route → in progress → completed), add notes, before/after photo capture (camera or library) via expo-image-picker uploaded to Supabase Storage, existing line items with subtotal
- **Customers tab** — Searchable customer list; tap to open customer detail
- **Customer detail** — Profile card with call/email buttons, contact info, address list, equipment list (type/make/model/serial/warranty), full service history with job links
- **More tab** — Technician profile (name, email, phone), push notification status badge, app version display, sign-out with confirmation
- **Push notifications** — Expo push token registered on app open and saved to `users.expo_push_token` (delivery coming in Phase 5)

### Phase 5 ✅ — Notifications + Embeddable Booking Widget
- **Twilio SMS** — Automated SMS at key events: 24hr reminder, 2hr reminder, technician en route, job completed, review request; respects `notification_preferences` per org; every send logged to `notification_logs`
- **SendGrid Email** — Same events delivered as branded HTML email (FieldPro blue `#2563EB`); honors `channel` preference (sms / email / both)
- **Expo Push Notifications** — When a job status changes, the assigned technician receives a push notification via Expo's push API using `users.expo_push_token`
- **Review Request Flow** — After job completion, automatically SMS/emails customer a Google review link (`organizations.google_review_url`); inserts record into `review_requests`
- **`POST /api/notifications/send`** — Internal Bearer-token-protected route; accepts `{ orgId, jobId, event }` and fires all applicable channels
- **`POST /api/review-requests`** — Auth-protected route; sends review request for a completed job
- **`POST /api/bookings/widget`** — Public CORS-enabled route; validates widget submissions; finds/creates customer by phone; saves booking; emails contractor
- **Embeddable Booking Widget** (`apps/widget`) — Self-contained Vite + React IIFE bundle (`dist/widget.js`); renders a floating "Book Service" button; 3-step form (service type + urgency → preferred date/time → contact details); embed via:
  ```html
  <script src="https://your-app.com/widget.js" data-org-slug="your-slug" async></script>
  ```

### Phase 6 ✅ — AI Chat Agent (Claude API)
- **Claude-powered chat** — `/chat` page (auth-gated) lets contractors chat with an AI assistant that has full context of their org: today's jobs, outstanding invoices, customer count, recent activity
- **POST /api/chat** — Accepts `{ conversationId?, message }` from an authenticated contractor; loads or creates a `chat_conversations` row; fetches relevant org context from Supabase using the service role key; calls Claude `claude-3-5-sonnet-20241022` with a system prompt containing the org context; streams the response back using Next.js streaming (SSE); appends the assistant reply to the conversation `messages` JSONB column when streaming completes
- **Streaming UI** — Token-by-token display as Claude responds; cursor-blink effect during stream; "Thinking…" state before first token; Wrench icon + tool name shown while Claude calls tools
- **AI tool use** — Claude supports two tools: `get_job_details` (accepts `job_id`, returns full job record with line items and status history) and `get_customer_history` (accepts `customer_id`, returns full service history and invoice list); Anthropic `tool_use` message blocks; executed server-side against Supabase; result fed back as `tool_result` block; streaming continues
- **Chat UI** — Full-page interface at `/chat` with: left sidebar listing past conversations (title = first user message truncated to 40 chars, stored in `localStorage`); main message thread with user/assistant bubbles; "New Chat" button; auto-scroll to latest message; suggested starter prompts on empty state
- **Navigation** — "AI Chat" link added to sidebar nav with `MessageSquare` icon

### Phase 7 ✅ — AI Voice Agent (Twilio + Deepgram + Claude)
- **Inbound call handling** — `POST /api/voice/inbound` returns TwiML `<Connect><Stream>` to pipe caller audio to the WebSocket handler; `<Parameter>` elements carry caller/called numbers so the handler can look up the organisation without extra Twilio API calls
- **WebSocket stream handler** — Custom Node.js server (`server.ts`) upgrades `GET /api/voice/stream` connections; Twilio Media Stream delivers base64 µ-law 8 kHz audio chunks; each chunk is forwarded to a Deepgram live STT connection (`nova-2` model); final transcripts are sent to Claude (`claude-3-5-sonnet-20241022`) with full org context (same context as Phase 6 chat); Claude's reply is synthesised to speech via Deepgram TTS (`aura-asteria-en`, mulaw 8 kHz) and streamed back to the caller as Twilio `media` events
- **Booking creation from voice** — Claude signals booking intent with a structured `BOOKING:{...}` JSON block; the handler extracts name, service type, urgency, and preferred date, finds or creates the customer (matched by caller phone), inserts a `bookings` row with `source = 'voice'`, and emails the contractor via SendGrid
- **`POST /api/voice/status`** — Twilio status callback; updates `voice_calls.duration_seconds` and `outcome` for missed/busy/canceled calls
- **`voice_calls` table** — Every call is recorded on arrival with `twilio_call_sid`, `organization_id`, and `caller_number`; outcome and transcript are updated when the call ends
- **Settings page — Voice Agent section** — Shows the contractor's Twilio number (`organizations.phone`), enable/disable toggle (`ai_voice_enabled`), and setup instructions for the Twilio webhook URL
- **Migration `006_phase7_voice.sql`** — Adds `ai_voice_enabled BOOLEAN DEFAULT FALSE` to `organizations`
- **`DEEPGRAM_API_KEY`** — Added to `.env.local.example` with documentation comment
- **Custom server** — `apps/web/server.ts` (tsx) wraps Next.js with a `ws` WebSocket server; `dev` and `start` scripts updated accordingly

### Phase 8 ✅ — Marketing Site & Social Media Scheduling
- **Marketing site** (`apps/marketing`) — Public-facing Next.js 16 app on port 3001; shares `@field-service/ui` and `@field-service/shared`; fully static, no auth required
  - `/` — Hero + features grid (8 features) + 3-tier pricing section + testimonials + footer
  - `/features` — Expanded detail page for all 8 features with bullet lists
  - `/pricing` — Full pricing page with FAQ and plan comparison
  - Dark header with FieldPro brand (#2563EB blue), clean professional design with Tailwind CSS v4
- **Social media scheduling** (`apps/web`) — New "Social" section in the dashboard
  - `supabase/migrations/007_phase8_social.sql` — Extends `social_platform` enum with `twitter` and `linkedin` (RLS policies already covered in 002)
  - `/social` — Auth-gated page listing scheduled and published posts; each card shows platform icon (Twitter/X, Facebook, Instagram, LinkedIn), content preview, scheduled date, and status badge
  - **New Post modal** — Client component with platform selector, 280-char textarea with live counter, datetime-local scheduler; instant-publishes if date is in the past
  - `POST /api/social/posts` — Auth-protected, Zod-validated; inserts into `social_posts` via `createAdminClient()`
  - `DELETE /api/social/posts/[id]` — Deletes a scheduled post belonging to the org
  - **Sidebar** — "Social" link added between Notifications and AI Chat with `Share2` Lucide icon

### Phase 9 — Coming Next
- App store launch prep, analytics dashboard, multi-location support

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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key (public)
STRIPE_WEBHOOK_SECRET=             # Stripe webhook signing secret

# Notifications (Phase 5)
TWILIO_ACCOUNT_SID=                # Twilio account SID
TWILIO_AUTH_TOKEN=                 # Twilio auth token
TWILIO_PHONE_NUMBER=               # Your Twilio phone number

SENDGRID_API_KEY=                  # SendGrid API key
SENDGRID_FROM_EMAIL=               # Verified sender address in SendGrid

INTERNAL_API_SECRET=               # Random secret for Bearer auth on /api/notifications/send

# AI Agents (Phase 6+ — Claude chat)
ANTHROPIC_API_KEY=                 # Claude API key — from console.anthropic.com

# AI Voice Agent (Phase 7 — Deepgram STT + TTS)
DEEPGRAM_API_KEY=                  # Deepgram API key — from console.deepgram.com

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
