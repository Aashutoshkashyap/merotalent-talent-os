-- Isolated staging only. This ledger records only new draft uploads, never
-- infers ownership of historical objects from their filename.
CREATE TABLE IF NOT EXISTS public.neon_job_document_drafts (
  path text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  kind text NOT NULL CHECK (kind IN ('experience', 'training')),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'submitted', 'deleted')),
  application_id uuid REFERENCES public.job_applications(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT neon_job_document_state_consistency CHECK (
    (state = 'draft' AND application_id IS NULL AND deleted_at IS NULL) OR
    (state = 'submitted' AND application_id IS NOT NULL AND deleted_at IS NULL) OR
    (state = 'deleted' AND application_id IS NULL AND deleted_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS neon_job_document_drafts_cleanup_idx
  ON public.neon_job_document_drafts (uploaded_at)
  WHERE state = 'draft';
REVOKE ALL ON public.neon_job_document_drafts FROM PUBLIC;
