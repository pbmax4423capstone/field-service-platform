-- Phase 4: Mobile app support
-- Adds expo push token to users and sets up job-photos storage bucket

-- Add expo push token column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS expo_push_token_updated_at TIMESTAMPTZ;

-- Storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos to job-photos bucket
CREATE POLICY "Authenticated users can upload job photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

-- Allow authenticated users to view job photos
CREATE POLICY "Authenticated users can view job photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-photos');

-- Allow public to view job photos (for sharing)
CREATE POLICY "Public can view job photos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'job-photos');

-- Allow authenticated users to delete their own job photos
CREATE POLICY "Authenticated users can delete job photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-photos');
