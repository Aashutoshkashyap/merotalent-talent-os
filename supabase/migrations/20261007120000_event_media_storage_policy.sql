BEGIN;

-- 1. Ensure event-media bucket has strict image-only restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media', 'event-media', true, 8388608,
  ARRAY['image/avif', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/avif', 'image/jpeg', 'image/png', 'image/webp']::text[];

-- 2. Create private event-attachments bucket for event brochures/documents (PDF, DOC, DOCX)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-attachments', 'event-attachments', false, 10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

-- 3. Storage RLS policies for event-attachments
DROP POLICY IF EXISTS "Authenticated users upload event attachments" ON storage.objects;
CREATE POLICY "Authenticated users upload event attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(regexp_replace(name, '^.*\\.', '')) IN ('pdf', 'doc', 'docx')
);

DROP POLICY IF EXISTS "Users and Admins read event attachments" ON storage.objects;
CREATE POLICY "Users and Admins read event attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'event-attachments'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin())
);

COMMIT;
