-- ============================================================
-- Migration 007: Phase 8 — Social Media Scheduling
-- ============================================================
-- The social_posts table was created in 001_initial_schema.sql.
-- RLS policies for social_posts and social_accounts were added in
-- 002_rls_policies.sql ("Users can manage their organization's social posts").
-- No additional schema changes are required for Phase 8.
--
-- The social_platform enum in the initial schema supports:
-- 'facebook', 'instagram', 'tiktok'
-- We extend it here to also support 'twitter' and 'linkedin'.
-- ============================================================

ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'twitter';
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'linkedin';
