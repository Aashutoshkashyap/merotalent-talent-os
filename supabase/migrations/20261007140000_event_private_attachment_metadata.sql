-- Wire the existing private event-attachments bucket to canonical event records.
-- Object access remains controlled by the existing signed media authorization RPC.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime_type text;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_attachment_metadata_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_attachment_metadata_check CHECK (
    (attachment_path IS NULL AND attachment_name IS NULL AND attachment_mime_type IS NULL)
    OR (
      attachment_path IS NOT NULL
      AND attachment_path !~ '(^|/)\.\.(/|$)'
      AND char_length(attachment_path) <= 512
      AND attachment_name IS NOT NULL
      AND char_length(attachment_name) BETWEEN 1 AND 180
      AND attachment_mime_type IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    )
  );
