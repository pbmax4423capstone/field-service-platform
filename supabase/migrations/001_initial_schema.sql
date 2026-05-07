-- ============================================================
-- Migration 001: Initial Schema
-- Field Service Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'technician', 'office_staff');
CREATE TYPE job_status AS ENUM ('scheduled', 'dispatched', 'en_route', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'overdue', 'void');
CREATE TYPE payment_method AS ENUM ('credit_card', 'cash', 'check', 'ach', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'both');
CREATE TYPE notification_event AS ENUM (
  'appointment_reminder_24h', 'appointment_reminder_2h', 'appointment_confirmed',
  'technician_en_route', 'job_completed', 'invoice_sent', 'invoice_paid',
  'review_request', 'booking_confirmed'
);
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'scheduled', 'declined');
CREATE TYPE chat_status AS ENUM ('active', 'booking_created', 'handed_off', 'closed');
CREATE TYPE call_outcome AS ENUM ('booking_created', 'handed_off', 'voicemail', 'no_answer', 'other');
CREATE TYPE social_platform AS ENUM ('facebook', 'instagram', 'tiktok');
CREATE TYPE social_post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
CREATE TYPE price_book_category AS ENUM ('repair', 'maintenance', 'installation', 'parts', 'other');
CREATE TYPE equipment_type AS ENUM ('air_conditioner', 'furnace', 'heat_pump', 'air_handler', 'boiler', 'mini_split', 'thermostat', 'other');
CREATE TYPE plan_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE website_template AS ENUM ('starter', 'professional', 'business');
CREATE TYPE notification_delivery_status AS ENUM ('sent', 'delivered', 'failed', 'bounced');
CREATE TYPE booking_time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'flexible');
CREATE TYPE booking_urgency AS ENUM ('emergency', 'soon', 'flexible');
CREATE TYPE booking_source AS ENUM ('widget', 'chat', 'voice', 'manual');
CREATE TYPE photo_type AS ENUM ('before', 'after', 'other');

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE organizations (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                        TEXT NOT NULL,
  slug                        TEXT NOT NULL UNIQUE,
  phone                       TEXT,
  email                       TEXT,
  address                     TEXT,
  city                        TEXT,
  state                       CHAR(2),
  zip                         TEXT,
  service_area_zips           TEXT[] NOT NULL DEFAULT '{}',
  business_hours              JSONB,
  logo_url                    TEXT,
  primary_color               TEXT DEFAULT '#2563EB',
  secondary_color             TEXT DEFAULT '#1E40AF',
  website_template            website_template,
  website_domain              TEXT,
  google_review_url           TEXT,
  plan_tier                   plan_tier NOT NULL DEFAULT 'starter',
  stripe_account_id           TEXT,
  stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  twilio_phone_number         TEXT,
  sendgrid_sender_email       TEXT,
  ai_chat_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  ai_voice_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  ai_voice_hours              JSONB,
  ai_voice_forwarding_number  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'technician',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organization_id, role)
);

-- ============================================================
-- CUSTOMER TABLES
-- ============================================================

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  phone_alt       TEXT,
  notes           TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  label           TEXT,
  street          TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           CHAR(2) NOT NULL,
  zip             TEXT NOT NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  access_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_equipment (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  address_id      UUID NOT NULL REFERENCES customer_addresses ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  equipment_type  equipment_type NOT NULL,
  make            TEXT,
  model           TEXT,
  serial_number   TEXT,
  install_date    DATE,
  warranty_expiry DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOB TABLES
-- ============================================================

CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  address_id      UUID NOT NULL REFERENCES customer_addresses ON DELETE CASCADE,
  technician_id   UUID REFERENCES users ON DELETE SET NULL,
  status          job_status NOT NULL DEFAULT 'scheduled',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end   TIMESTAMPTZ,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  title           TEXT NOT NULL,
  description     TEXT,
  internal_notes  TEXT,
  invoice_id      UUID,  -- set when invoice is created
  estimate_id     UUID,  -- set if job came from estimate
  booking_id      UUID,  -- set if job came from booking
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_line_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID NOT NULL REFERENCES jobs ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  price_book_item_id UUID REFERENCES price_book_items ON DELETE SET NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  quantity          NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users,
  url             TEXT NOT NULL,
  caption         TEXT,
  photo_type      photo_type NOT NULL DEFAULT 'other',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  changed_by      UUID REFERENCES users,
  from_status     job_status,
  to_status       job_status NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRICE BOOK
-- ============================================================

CREATE TABLE price_books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE price_book_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_book_id   UUID NOT NULL REFERENCES price_books ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        price_book_category NOT NULL DEFAULT 'other',
  unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost            NUMERIC(10,2),
  taxable         BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESTIMATES & INVOICES
-- ============================================================

CREATE TABLE estimates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  address_id      UUID REFERENCES customer_addresses ON DELETE SET NULL,
  status          estimate_status NOT NULL DEFAULT 'draft',
  title           TEXT NOT NULL,
  notes           TEXT,
  terms           TEXT,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(6,4) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  valid_until     DATE,
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_line_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id       UUID NOT NULL REFERENCES estimates ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  price_book_item_id UUID REFERENCES price_book_items ON DELETE SET NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  quantity          NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs ON DELETE SET NULL,
  estimate_id     UUID REFERENCES estimates ON DELETE SET NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  invoice_number  TEXT NOT NULL,
  title           TEXT NOT NULL,
  notes           TEXT,
  terms           TEXT,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(6,4) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_due     NUMERIC(10,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  due_date        DATE,
  sent_at         TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  public_token    TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by      UUID NOT NULL REFERENCES users,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE TABLE invoice_line_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID NOT NULL REFERENCES invoices ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  price_book_item_id UUID REFERENCES price_book_items ON DELETE SET NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  quantity          NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id           UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  invoice_id                UUID NOT NULL REFERENCES invoices ON DELETE CASCADE,
  amount                    NUMERIC(10,2) NOT NULL,
  method                    payment_method NOT NULL,
  status                    payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  notes                     TEXT,
  collected_by              UUID REFERENCES users ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  event                 notification_event NOT NULL,
  channel               notification_channel NOT NULL DEFAULT 'both',
  is_enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  template_sms          TEXT,
  template_email_subject TEXT,
  template_email_body   TEXT,
  reminder_offset_minutes INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, event)
);

CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers ON DELETE SET NULL,
  job_id            UUID REFERENCES jobs ON DELETE SET NULL,
  event             notification_event NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient         TEXT NOT NULL,
  message           TEXT NOT NULL,
  status            notification_delivery_status NOT NULL DEFAULT 'sent',
  provider_message_id TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ,
  channel         TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  review_url      TEXT NOT NULL,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS & LEADS
-- ============================================================

CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers ON DELETE SET NULL,
  status                booking_status NOT NULL DEFAULT 'pending',
  service_requested     TEXT NOT NULL,
  preferred_date        DATE,
  preferred_time_of_day booking_time_of_day,
  urgency               booking_urgency,
  customer_name         TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,
  customer_email        TEXT,
  address               TEXT NOT NULL,
  notes                 TEXT,
  source                booking_source NOT NULL DEFAULT 'widget',
  job_id                UUID REFERENCES jobs ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  message         TEXT,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI AGENTS
-- ============================================================

CREATE TABLE chat_conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers ON DELETE SET NULL,
  status              chat_status NOT NULL DEFAULT 'active',
  messages            JSONB NOT NULL DEFAULT '[]',
  booking_id          UUID REFERENCES bookings ON DELETE SET NULL,
  visitor_identifier  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE voice_calls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  twilio_call_sid TEXT NOT NULL UNIQUE,
  caller_number   TEXT NOT NULL,
  duration_seconds INTEGER,
  outcome         call_outcome NOT NULL DEFAULT 'other',
  transcript      TEXT,
  booking_id      UUID REFERENCES bookings ON DELETE SET NULL,
  recording_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL MEDIA
-- ============================================================

CREATE TABLE social_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  platform              social_platform NOT NULL,
  account_name          TEXT NOT NULL,
  account_id            TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at      TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, platform, account_id)
);

CREATE TABLE social_posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  platforms         social_platform[] NOT NULL,
  content           TEXT NOT NULL,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  status            social_post_status NOT NULL DEFAULT 'draft',
  scheduled_for     TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  platform_post_ids JSONB NOT NULL DEFAULT '{}',
  error_message     TEXT,
  created_by        UUID NOT NULL REFERENCES users,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations (slug);

-- Users
CREATE INDEX idx_users_organization_id ON users (organization_id);
CREATE INDEX idx_users_email ON users (email);

-- Customers
CREATE INDEX idx_customers_organization_id ON customers (organization_id);
CREATE INDEX idx_customers_phone ON customers (organization_id, phone);
CREATE INDEX idx_customers_email ON customers (organization_id, email);
CREATE INDEX idx_customers_name ON customers (organization_id, last_name, first_name);

-- Customer addresses
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses (customer_id);

-- Customer equipment
CREATE INDEX idx_customer_equipment_customer_id ON customer_equipment (customer_id);
CREATE INDEX idx_customer_equipment_address_id ON customer_equipment (address_id);

-- Jobs
CREATE INDEX idx_jobs_organization_id ON jobs (organization_id);
CREATE INDEX idx_jobs_customer_id ON jobs (customer_id);
CREATE INDEX idx_jobs_technician_id ON jobs (technician_id);
CREATE INDEX idx_jobs_status ON jobs (organization_id, status);
CREATE INDEX idx_jobs_scheduled_start ON jobs (organization_id, scheduled_start);

-- Job sub-tables
CREATE INDEX idx_job_line_items_job_id ON job_line_items (job_id);
CREATE INDEX idx_job_photos_job_id ON job_photos (job_id);
CREATE INDEX idx_job_notes_job_id ON job_notes (job_id);
CREATE INDEX idx_job_status_history_job_id ON job_status_history (job_id);

-- Price book
CREATE INDEX idx_price_book_items_organization_id ON price_book_items (organization_id);
CREATE INDEX idx_price_book_items_category ON price_book_items (organization_id, category);

-- Estimates
CREATE INDEX idx_estimates_organization_id ON estimates (organization_id);
CREATE INDEX idx_estimates_customer_id ON estimates (customer_id);
CREATE INDEX idx_estimates_status ON estimates (organization_id, status);

-- Invoices
CREATE INDEX idx_invoices_organization_id ON invoices (organization_id);
CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX idx_invoices_status ON invoices (organization_id, status);
CREATE INDEX idx_invoices_public_token ON invoices (public_token);

-- Payments
CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_organization_id ON payments (organization_id);

-- Bookings
CREATE INDEX idx_bookings_organization_id ON bookings (organization_id);
CREATE INDEX idx_bookings_status ON bookings (organization_id, status);

-- Chat conversations
CREATE INDEX idx_chat_conversations_organization_id ON chat_conversations (organization_id);

-- Voice calls
CREATE INDEX idx_voice_calls_organization_id ON voice_calls (organization_id);

-- Social posts
CREATE INDEX idx_social_posts_organization_id ON social_posts (organization_id);
CREATE INDEX idx_social_posts_scheduled ON social_posts (organization_id, scheduled_for) WHERE status = 'scheduled';

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_equipment_updated_at BEFORE UPDATE ON customer_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER price_book_items_updated_at BEFORE UPDATE ON price_book_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
