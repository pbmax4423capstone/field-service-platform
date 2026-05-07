-- ============================================================
-- Migration 004: Phase 3 — Payments & Financial Improvements
-- ============================================================
-- This migration adds indexes and any missing helpers for the
-- Stripe Connect payments, invoice PDF, and estimates flow.
-- The core tables (invoices, estimates, payments) were created
-- in migration 001; this file adds performance indexes and
-- ensures the public_token column exists on invoices.
-- ============================================================

-- Ensure public_token is unique and indexed for fast lookups
-- (may already exist from 001, but CREATE INDEX IF NOT EXISTS is safe)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_token_idx
  ON invoices (public_token);

-- Index on invoices by organization + status for fast filtering
CREATE INDEX IF NOT EXISTS invoices_org_status_idx
  ON invoices (organization_id, status);

-- Index on estimates by organization + status
CREATE INDEX IF NOT EXISTS estimates_org_status_idx
  ON estimates (organization_id, status);

-- Index on payments by invoice_id
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx
  ON payments (invoice_id);

-- Index on payments by stripe_payment_intent_id (webhook lookups)
CREATE INDEX IF NOT EXISTS payments_stripe_intent_idx
  ON payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- RLS for payments table: contractors can read/insert their own org's payments
-- (Policies may already exist from 002, this is additive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'payments_org_select'
  ) THEN
    CREATE POLICY payments_org_select ON payments
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'payments_org_insert'
  ) THEN
    CREATE POLICY payments_org_insert ON payments
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Function to auto-generate invoice public tokens on insert (if not provided)
CREATE OR REPLACE FUNCTION generate_invoice_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := encode(gen_random_bytes(24), 'base64url');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_public_token_trigger ON invoices;
CREATE TRIGGER invoice_public_token_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_public_token();

-- Helper view: invoice summary for dashboard stats
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'draft')   AS draft_count,
  COUNT(*) FILTER (WHERE status = 'sent')    AS sent_count,
  COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
  SUM(total) FILTER (WHERE status != 'void') AS total_invoiced,
  SUM(amount_paid)                           AS total_collected,
  SUM(balance_due) FILTER (WHERE status NOT IN ('paid', 'void')) AS total_outstanding
FROM invoices
GROUP BY organization_id;

-- Helper view: estimate summary
CREATE OR REPLACE VIEW estimate_summary AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'draft')    AS draft_count,
  COUNT(*) FILTER (WHERE status = 'sent')     AS sent_count,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
  COUNT(*) FILTER (WHERE status = 'declined') AS declined_count,
  SUM(total) FILTER (WHERE status = 'accepted') AS total_accepted_value
FROM estimates
GROUP BY organization_id;
