-- ============================================================
-- NSK ESPORTS — 002_qr_code_and_storage.sql
-- Run this in Supabase SQL Editor to finish setting up:
-- 1. qr_code_url column on tournaments
-- 2. Storage buckets for payment screenshots and banners
-- 3. Storage RLS policies for uploads and downloads
-- ============================================================

-- 1. Add qr_code_url column to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 2. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-screenshots', 'payment-screenshots', false, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tournament-banners', 'tournament-banners', true, 2097152, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- Allow public to upload payment screenshots during registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Upload Payment Screenshots'
  ) THEN
    CREATE POLICY "Public Upload Payment Screenshots" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'payment-screenshots');
  END IF;
END $$;

-- Allow authenticated admins full access to payment screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Payment Screenshots'
  ) THEN
    CREATE POLICY "Admin All Payment Screenshots" ON storage.objects
    FOR ALL TO authenticated USING (bucket_id = 'payment-screenshots');
  END IF;
END $$;

-- Allow public to view tournament banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Tournament Banners'
  ) THEN
    CREATE POLICY "Public Read Tournament Banners" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'tournament-banners');
  END IF;
END $$;

-- Allow authenticated admins full access to tournament banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Tournament Banners'
  ) THEN
    CREATE POLICY "Admin All Tournament Banners" ON storage.objects
    FOR ALL TO authenticated USING (bucket_id = 'tournament-banners');
  END IF;
END $$;
