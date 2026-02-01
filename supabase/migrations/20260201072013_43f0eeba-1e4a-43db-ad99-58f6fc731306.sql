-- Add new columns to profiles table for full onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS experience_level text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS resume_url text;

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for resume uploads (users can upload their own)
CREATE POLICY "Users can upload their own resume"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own resumes
CREATE POLICY "Users can view their own resume"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own resumes
CREATE POLICY "Users can update their own resume"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own resumes
CREATE POLICY "Users can delete their own resume"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);