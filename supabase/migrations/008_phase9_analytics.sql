-- ============================================================
-- Migration 008: Phase 9 — Analytics Dashboard & Multi-Location
-- ============================================================

-- ============================================================
-- REPORTS TABLE (saved analytics snapshots)
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL, -- 'revenue' | 'jobs' | 'technicians'
  params           JSONB NOT NULL DEFAULT '{}',
  data             JSONB NOT NULL DEFAULT '{}',
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their reports"
ON reports FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can insert reports"
ON reports FOR INSERT
WITH CHECK (organization_id = auth.organization_id());

CREATE POLICY "Org members can update their reports"
ON reports FOR UPDATE
USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can delete their reports"
ON reports FOR DELETE
USING (organization_id = auth.organization_id());

-- ============================================================
-- LOCATIONS TABLE (multi-location support)
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  address          TEXT,
  phone            TEXT,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their locations"
ON locations FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can insert locations"
ON locations FOR INSERT
WITH CHECK (organization_id = auth.organization_id());

CREATE POLICY "Org members can update their locations"
ON locations FOR UPDATE
USING (organization_id = auth.organization_id());

CREATE POLICY "Org members can delete their locations"
ON locations FOR DELETE
USING (organization_id = auth.organization_id());

-- ============================================================
-- JOBS — add optional location_id FK
-- ============================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
