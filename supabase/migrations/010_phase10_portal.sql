-- ============================================================
-- Migration 010: Phase 10 — Customer Portal & Dispatch Board
-- ============================================================

-- ============================================================
-- CUSTOMER PORTAL TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_portal_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_tokens_token_idx ON customer_portal_tokens(token);
CREATE INDEX IF NOT EXISTS portal_tokens_org_idx   ON customer_portal_tokens(organization_id);

ALTER TABLE customer_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Only the org that owns the customer can read or delete tokens
CREATE POLICY "Org members can view portal tokens"
ON customer_portal_tokens FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can delete portal tokens"
ON customer_portal_tokens FOR DELETE
USING (organization_id = auth.organization_id());

-- No RLS insert restriction — service role handles inserts

-- ============================================================
-- JOBS — add estimated_duration_minutes for dispatch board
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
