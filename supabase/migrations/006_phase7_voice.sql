-- Phase 7: AI Voice Agent
-- Adds ai_voice_enabled toggle to organizations table

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS ai_voice_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN organizations.ai_voice_enabled IS
  'Whether the AI voice agent is active for inbound calls on this org''s Twilio number.';
