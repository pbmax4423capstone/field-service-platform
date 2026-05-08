-- ============================================================
-- Migration 009: Tax Rates by Location
-- ============================================================

-- ============================================================
-- TAX RATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- e.g. "Mobile, AL" or "Baldwin County, AL"
  state CHAR(2) NOT NULL,            -- e.g. "AL"
  city TEXT,                         -- optional city name, e.g. "Mobile"
  county TEXT,                       -- optional county name, e.g. "Baldwin County"
  zip_codes TEXT[],                  -- optional array of zip codes, e.g. '{36602,36603}'
  rate NUMERIC(6,4) NOT NULL,        -- e.g. 0.1000 = 10%
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tax_rates_org_idx ON tax_rates(organization_id);
CREATE INDEX IF NOT EXISTS tax_rates_org_state_idx ON tax_rates(organization_id, state);

-- Enable RLS
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view tax rates"
  ON tax_rates FOR SELECT
  USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can insert tax rates"
  ON tax_rates FOR INSERT
  WITH CHECK (organization_id = auth.organization_id());

CREATE POLICY "Org members can update tax rates"
  ON tax_rates FOR UPDATE
  USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can delete tax rates"
  ON tax_rates FOR DELETE
  USING (organization_id = auth.organization_id());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_tax_rates_updated_at();
