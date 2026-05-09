-- ============================================================
-- Migration 002: Row-Level Security Policies
-- Tenant isolation: users can only see their organization's data
-- ============================================================

-- Helper function: get the current user's organization_id
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user has a specific role
CREATE OR REPLACE FUNCTION auth.has_role(check_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND organization_id = auth.organization_id()
      AND role = check_role
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id = auth.organization_id());

CREATE POLICY "Admins can update their organization"
ON organizations FOR UPDATE
USING (id = auth.organization_id() AND auth.has_role('admin'));

-- ============================================================
-- USERS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organization"
ON users FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can insert users into their organization"
ON users FOR INSERT
WITH CHECK (organization_id = auth.organization_id() AND auth.has_role('admin'));

-- ============================================================
-- USER ROLES
-- ============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their organization"
ON user_roles FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Admins can manage roles in their organization"
ON user_roles FOR ALL
USING (organization_id = auth.organization_id() AND auth.has_role('admin'));

-- ============================================================
-- CUSTOMERS
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's customers"
ON customers FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Users can create customers in their organization"
ON customers FOR INSERT
WITH CHECK (organization_id = auth.organization_id());

CREATE POLICY "Users can update their organization's customers"
ON customers FOR UPDATE
USING (organization_id = auth.organization_id());

CREATE POLICY "Admins can delete customers"
ON customers FOR DELETE
USING (organization_id = auth.organization_id() AND auth.has_role('admin'));

-- ============================================================
-- CUSTOMER ADDRESSES
-- ============================================================

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their organization's customer addresses"
ON customer_addresses FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- CUSTOMER EQUIPMENT
-- ============================================================

ALTER TABLE customer_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their organization's customer equipment"
ON customer_equipment FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- JOBS
-- ============================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's jobs"
ON jobs FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Users can create jobs in their organization"
ON jobs FOR INSERT
WITH CHECK (organization_id = auth.organization_id());

CREATE POLICY "Users can update their organization's jobs"
ON jobs FOR UPDATE
USING (organization_id = auth.organization_id());

CREATE POLICY "Admins can delete jobs"
ON jobs FOR DELETE
USING (organization_id = auth.organization_id() AND auth.has_role('admin'));

-- ============================================================
-- JOB SUB-TABLES (line items, photos, notes, history)
-- ============================================================

ALTER TABLE job_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's job line items"
ON job_line_items FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's job photos"
ON job_photos FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's job notes"
ON job_notes FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's job status history"
ON job_status_history FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Users can insert job status history for their organization"
ON job_status_history FOR INSERT
WITH CHECK (organization_id = auth.organization_id());

-- ============================================================
-- PRICE BOOK
-- ============================================================

ALTER TABLE price_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's price books"
ON price_books FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's price book items"
ON price_book_items FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- ESTIMATES
-- ============================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's estimates"
ON estimates FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's estimate line items"
ON estimate_line_items FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- INVOICES
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their organization's invoices"
ON invoices FOR ALL
USING (organization_id = auth.organization_id());

-- Public read policy for customer-facing payment page (uses public_token)
CREATE POLICY "Anyone can view invoice by public token"
ON invoices FOR SELECT
USING (public_token IS NOT NULL AND auth.uid() IS NULL);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's invoice line items"
ON invoice_line_items FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- PAYMENTS
-- ============================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's payments"
ON payments FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's notification preferences"
ON notification_preferences FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's notification logs"
ON notification_logs FOR SELECT
USING (organization_id = auth.organization_id());

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's review requests"
ON review_requests FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- BOOKINGS & LEADS
-- ============================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their organization's bookings"
ON bookings FOR ALL
USING (organization_id = auth.organization_id());

-- Service role bypasses RLS — anon users must match the organization_id of an existing org
-- The API route enforces org lookup by slug before inserting, providing the real gatekeeper.
-- This policy prevents direct anonymous inserts via Supabase REST to arbitrary org IDs.
CREATE POLICY "Anon users can insert bookings for valid orgs"
ON bookings FOR INSERT
WITH CHECK (
  organization_id IN (SELECT id FROM organizations)
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's leads"
ON leads FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- AI AGENTS
-- ============================================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's chat conversations"
ON chat_conversations FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's voice calls"
ON voice_calls FOR ALL
USING (organization_id = auth.organization_id());

-- ============================================================
-- SOCIAL MEDIA
-- ============================================================

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's social accounts"
ON social_accounts FOR ALL
USING (organization_id = auth.organization_id());

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's social posts"
ON social_posts FOR ALL
USING (organization_id = auth.organization_id());
